import React, { useEffect, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Trophy, FolderOpen, BookOpen, Sparkles } from "lucide-react";
import { SIDEBAR_TOOLS, type ProjectRecord } from "@rankstudio/shared";
import { engineFetch } from "../lib/engine";
import { setToken } from "../lib/settings";
import { useToast } from "../components/Toast";

export const HomePage: React.FC = () => {
  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Welcome to RankStudio</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Create 9:16 Video Ranking videos locally on your machine with pixel-identical
          Remotion live preview and H.264 MP4 export.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/video-ranking-new"
          className="rounded-2xl border border-[#2A2A32] bg-[#17171B] p-5 hover:border-[#7C5CFF] transition-colors space-y-2"
        >
          <Trophy className="h-6 w-6 text-[#7C5CFF]" />
          <div className="font-semibold text-white">New Video Ranking</div>
          <p className="text-xs text-zinc-400">
            Upload local clips, style your title, add SFX & voiceover, and render 1080×1920 MP4s.
          </p>
        </Link>

        <Link
          to="/library"
          className="rounded-2xl border border-[#2A2A32] bg-[#17171B] p-5 hover:border-[#7C5CFF] transition-colors space-y-2"
        >
          <FolderOpen className="h-6 w-6 text-emerald-400" />
          <div className="font-semibold text-white">Open Library</div>
          <p className="text-xs text-zinc-400">
            Track live renders, download MP4s, reuse templates, and browse voices.
          </p>
        </Link>

        <Link
          to="/tutorial"
          className="rounded-2xl border border-[#2A2A32] bg-[#17171B] p-5 hover:border-[#7C5CFF] transition-colors space-y-2"
        >
          <BookOpen className="h-6 w-6 text-amber-400" />
          <div className="font-semibold text-white">Quick Tutorial</div>
          <p className="text-xs text-zinc-400">
            Learn how pairing, local SFX, trimming, and rendering work together.
          </p>
        </Link>
      </div>
    </div>
  );
};

export const TutorialPage: React.FC = () => (
  <div className="p-8 max-w-3xl space-y-5">
    <h1 className="text-2xl font-bold text-white">RankStudio Tutorial</h1>
    <ol className="list-decimal space-y-3 pl-5 text-sm text-zinc-300">
      <li>
        <strong className="text-white">Start the local engine:</strong> Run{" "}
        <code className="rounded bg-[#17171B] px-1.5 py-0.5 text-emerald-400">
          npm run engine
        </code>{" "}
        and paste the printed pairing token once into Settings (or click the pair link).
      </li>
      <li>
        <strong className="text-white">Style your title:</strong> Select individual words
        in the Ranking Title editor to assign fonts, colors, highlights, emojis, and stroke.
        Use <em>Drag Title</em> to position it directly on the 9:16 preview.
      </li>
      <li>
        <strong className="text-white">Upload & trim clips:</strong> Drop local MP4, MOV,
        or WebM files (up to 500 MB) into each Rank Slot. Once ingested, drag the green
        Start and red End handles or use ←/→ for 0.1 s nudges.
      </li>
      <li>
        <strong className="text-white">Add SFX, Voiceover & Animations:</strong> Search
        your local Sound Effects folder, attach voice audio (with optional 3-word auto
        captions), and pick entrance animations and clip transitions.
      </li>
      <li>
        <strong className="text-white">Generate & Download:</strong> Click{" "}
        <em>Generate Video Ranking</em> to render locally and download your 1080×1920 MP4
        from the Library.
      </li>
    </ol>
  </div>
);

export const FreeCoursePage: React.FC = () => (
  <div className="p-8 max-w-2xl space-y-3">
    <h1 className="text-2xl font-bold text-white">Free Course</h1>
    <p className="text-sm text-zinc-400">
      Short-form ranking pacing, hooks, and retention guides are coming soon. In the
      meantime, check the{" "}
      <Link to="/tutorial" className="text-[#7C5CFF] underline">
        Tutorial
      </Link>{" "}
      to get started with Video Ranking.
    </p>
  </div>
);

export const ComingSoonPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const tool = SIDEBAR_TOOLS.find((t) => t.slug === slug);
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7C5CFF]/15 text-[#7C5CFF]">
        <Sparkles className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold text-white">{tool?.name || "Tool"}</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Coming soon. Video Ranking is ready to use today!
      </p>
      <Link
        to="/video-ranking-new"
        className="mt-5 rounded-lg bg-[#7C5CFF] px-4 py-2 text-xs font-medium text-white hover:bg-[#6C49F5]"
      >
        Open Video Ranking
      </Link>
    </div>
  );
};

export const NewVideoRankingRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createdRef = useRef(false);

  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;
    engineFetch<ProjectRecord>("/projects", {
      method: "POST",
      body: JSON.stringify({ name: "Untitled Video Ranking", tool: "video-ranking" }),
    })
      .then((p) => {
        navigate(`/video-ranking/${p.id}`, { replace: true });
      })
      .catch((err) => {
        toast(err instanceof Error ? err.message : "Could not create project", "error");
        navigate("/", { replace: true });
      });
  }, [navigate, toast]);

  return (
    <div className="flex h-full items-center justify-center text-sm text-zinc-400">
      Creating new Video Ranking draft…
    </div>
  );
};

export const SettingsRoutePage: React.FC<{
  onOpenSettings: (token?: string) => void;
}> = ({ onOpenSettings }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setToken(token);
      onOpenSettings(token);
      navigate("/", { replace: true });
    } else {
      onOpenSettings();
    }
  }, [searchParams, onOpenSettings, navigate]);

  return (
    <div className="p-8 text-sm text-zinc-400">Opening Engine Settings…</div>
  );
};
