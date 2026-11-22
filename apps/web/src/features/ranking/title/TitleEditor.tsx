import React, { useEffect, useState } from "react";
import { Extension } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Smile,
  Move,
} from "lucide-react";
import { useRankingStore } from "../store";
import { FontPicker } from "./FontPicker";
import { ColorPopover } from "./ColorPopover";

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

const FONT_SIZES = [32, 40, 48, 56, 64, 72, 84, 96];

export const TitleEditor: React.FC = () => {
  const project = useRankingStore((s) => s.project);
  const updateProject = useRankingStore((s) => s.updateProject);
  const dragTarget = useRankingStore((s) => s.dragTarget);
  const setDragTarget = useRankingStore((s) => s.setDragTarget);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ["paragraph"] }),
    ],
    content: project.title.doc,
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON();
      updateProject((prev) => ({
        ...prev,
        title: { ...prev.title, doc: json },
      }));
    },
  });

  // Sync external hydrate/undo changes into Tiptap without cursor loop
  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(project.title.doc);
    if (current !== incoming) {
      editor.commands.setContent(project.title.doc, false);
    }
  }, [editor, project.title.doc]);

  if (!editor) return null;

  const activeAttrs = editor.getAttributes("textStyle");
  const currentFont = (activeAttrs.fontFamily as string) || "Archivo Black";
  const currentSize = parseInt(String(activeAttrs.fontSize || "64"), 10) || 64;
  const currentColor = (activeAttrs.color as string) || "#FFFFFF";
  const currentHighlight =
    (editor.getAttributes("highlight").color as string | undefined) || "";

  const setAlign = (align: "left" | "center" | "right") => {
    editor.chain().focus().setTextAlign(align).run();
    updateProject((prev) => ({
      ...prev,
      title: { ...prev.title, align },
    }));
  };

  return (
    <section className="rounded-xl border border-[#2A2A32] bg-[#17171B] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Ranking Title</h2>
        <button
          type="button"
          onClick={() => setDragTarget(dragTarget === "title" ? "none" : "title")}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            dragTarget === "title"
              ? "bg-[#7C5CFF] text-white"
              : "border border-[#2A2A32] bg-[#0E0E10] text-zinc-300 hover:border-zinc-600"
          }`}
        >
          <Move className="h-3.5 w-3.5" />
          {dragTarget === "title" ? "Dragging Title…" : "Drag Title"}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#2A2A32] bg-[#121216] p-2">
        <FontPicker
          value={currentFont}
          onChange={(font) => editor.chain().focus().setFontFamily(font).run()}
        />

        <select
          value={currentSize}
          onChange={(e) =>
            editor
              .chain()
              .focus()
              .setMark("textStyle", { fontSize: `${e.target.value}px` })
              .run()
          }
          className="rounded-md border border-[#2A2A32] bg-[#0E0E10] px-2 py-1 text-xs text-zinc-100"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded p-1.5 ${
            editor.isActive("bold")
              ? "bg-[#7C5CFF] text-white"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
          }`}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded p-1.5 ${
            editor.isActive("italic")
              ? "bg-[#7C5CFF] text-white"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
          }`}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>

        <ColorPopover
          label="Text"
          value={currentColor}
          onChange={(hex) => editor.chain().focus().setColor(hex).run()}
        />

        <ColorPopover
          label="BG"
          value={currentHighlight}
          allowClear
          onChange={(hex) =>
            editor.chain().focus().toggleHighlight({ color: hex }).run()
          }
          onClear={() => editor.chain().focus().unsetHighlight().run()}
        />

        <div className="flex items-center rounded border border-[#2A2A32] bg-[#0E0E10]">
          <button
            type="button"
            onClick={() => setAlign("left")}
            className={`p-1.5 ${project.title.align === "left" ? "text-[#7C5CFF]" : "text-zinc-400"}`}
            title="Align left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAlign("center")}
            className={`p-1.5 ${project.title.align === "center" ? "text-[#7C5CFF]" : "text-zinc-400"}`}
            title="Align center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAlign("right")}
            className={`p-1.5 ${project.title.align === "right" ? "text-[#7C5CFF]" : "text-zinc-400"}`}
            title="Align right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            title="Insert Emoji"
          >
            <Smile className="h-3.5 w-3.5" />
          </button>
          {emojiOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5">
              <Picker
                data={data}
                theme="dark"
                onEmojiSelect={(emoji: { native?: string }) => {
                  if (emoji.native) {
                    editor.chain().focus().insertContent(emoji.native).run();
                  }
                  setEmojiOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Rich-text input */}
      <div className="rounded-lg border border-[#2A2A32] bg-[#0E0E10] px-3 py-2 text-base text-white">
        <EditorContent editor={editor} />
      </div>

      {/* Title Stroke */}
      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span>Title Stroke</span>
          <ColorPopover
            value={project.title.strokeColor}
            onChange={(hex) =>
              updateProject((prev) => ({
                ...prev,
                title: { ...prev.title, strokeColor: hex },
              }))
            }
          />
        </div>
        <label className="flex items-center gap-2 flex-1 min-w-[140px]">
          <span>Width: {project.title.strokeWidth}px</span>
          <input
            type="range"
            min={0}
            max={20}
            value={project.title.strokeWidth}
            onChange={(e) =>
              updateProject((prev) => ({
                ...prev,
                title: { ...prev.title, strokeWidth: Number(e.target.value) },
              }))
            }
            className="flex-1 accent-[#7C5CFF]"
          />
        </label>
      </div>
    </section>
  );
};
