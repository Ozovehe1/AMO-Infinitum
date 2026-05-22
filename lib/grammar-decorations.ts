import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type GrammarCorrection = { original: string; corrected: string; reason: string };

export const grammarPluginKey = new PluginKey<DecorationSet>("grammar");

export const GrammarExtension = Extension.create({
  name: "grammarDecorations",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: grammarPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            const meta = tr.getMeta(grammarPluginKey);
            if (meta !== undefined) return meta;
            return set.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return grammarPluginKey.getState(state);
          },
        },
      }),
    ];
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildGrammarDecos(doc: any, corrections: GrammarCorrection[]): DecorationSet {
  const decos: Decoration[] = [];
  corrections.forEach(c => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc.descendants((node: any, pos: number) => {
      if (!node.isText || !node.text) return;
      const text = node.text as string;
      let start = 0;
      while (true) {
        const idx = text.indexOf(c.original, start);
        if (idx === -1) break;
        decos.push(
          Decoration.inline(pos + idx, pos + idx + c.original.length, {
            class: "grammar-error",
          })
        );
        start = idx + 1;
      }
    });
  });
  return DecorationSet.create(doc, decos);
}
