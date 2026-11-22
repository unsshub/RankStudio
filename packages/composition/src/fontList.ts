export interface FontOption {
  label: string;
  family: string;
}

export const FONT_LIST: FontOption[] = [
  { label: "Ranking Font", family: "Anton" },
  { label: "Archivo Black", family: "Archivo Black" },
  { label: "ABeeZee", family: "ABeeZee" },
  { label: "Abril Fatface", family: "Abril Fatface" },
  { label: "Anton", family: "Anton" },
  { label: "Bebas Neue", family: "Bebas Neue" },
  { label: "Bangers", family: "Bangers" },
  { label: "Montserrat", family: "Montserrat" },
  { label: "Poppins", family: "Poppins" },
  { label: "Oswald", family: "Oswald" },
  { label: "Roboto", family: "Roboto" },
  { label: "Inter", family: "Inter" },
  { label: "Lobster", family: "Lobster" },
  { label: "Pacifico", family: "Pacifico" },
  { label: "Permanent Marker", family: "Permanent Marker" },
  { label: "Russo One", family: "Russo One" },
  { label: "Righteous", family: "Righteous" },
  { label: "Bungee", family: "Bungee" },
  { label: "Black Ops One", family: "Black Ops One" },
  { label: "Luckiest Guy", family: "Luckiest Guy" },
  { label: "Fredoka", family: "Fredoka" },
  { label: "Rubik", family: "Rubik" },
  { label: "Playfair Display", family: "Playfair Display" },
  { label: "Teko", family: "Teko" },
  { label: "Barlow Condensed", family: "Barlow Condensed" },
  { label: "Kanit", family: "Kanit" },
];

export function resolveFontFamily(name: string): string {
  if (name === "Ranking Font") {
    return "'Anton', sans-serif";
  }
  return `'${name}', sans-serif`;
}
