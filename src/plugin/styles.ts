// Functions for getting styles from files.

import type {
  LibraryStyle,
  LibraryTextStyle,
  LibraryEffectStyle,
} from "../types";

export async function getLocalPaintStyles(): Promise<LibraryStyle[]> {
  const paintStyles = await figma.getLocalPaintStylesAsync();
  const paintStylesData: LibraryStyle[] = paintStyles.map((style) => ({
    id: style.id,
    name: style.name,
    paint: style.paints[0],
  }));

  return paintStylesData;
}

export async function getLocalTextStyles(): Promise<LibraryTextStyle[]> {
  const textStyles = await figma.getLocalTextStylesAsync();
  const textStylesData: LibraryTextStyle[] = textStyles.map((style) => ({
    id: style.id,
    key: style.key,
    name: style.name,
    description: style.description,
    style: {
      fontFamily: style.fontName.family,
      fontStyle: style.fontName.style,
      fontSize: style.fontSize,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      textDecoration: style.textDecoration,
      paragraphIndent: style.paragraphIndent,
      paragraphSpacing: style.paragraphSpacing,
      textCase: style.textCase,
    },
  }));

  return textStylesData;
}

export async function getLocalEffectStyles(): Promise<LibraryEffectStyle[]> {
  const effectStyles = await figma.getLocalEffectStylesAsync();
  const effectStylesData: LibraryEffectStyle[] = effectStyles.map((style) => ({
    id: style.id,
    name: style.name,
    effects: style.effects,
  }));

  return effectStylesData;
}

export async function saveToLocalStorage(
  data: unknown,
  fileName: string,
): Promise<void> {
  console.log("set storage");
  await figma.clientStorage.setAsync(fileName, data);
}
