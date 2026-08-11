import type { Data } from '@measured/puck';
import { puckConfig } from './puckConfig';

/**
 * Rendu public d'un arbre Puck SANS la librairie Puck : le format Data est
 * une simple liste { content: [{ type, props }] } et nos blocs n'utilisent
 * pas de DropZones. Importer <Render> de @measured/puck ajoutait ~350 Ko au
 * bundle principal servi à chaque visiteur — l'éditeur (admin, lazy) reste
 * le seul consommateur de la lib.
 *
 * Un type de bloc inconnu est ignoré : c'est ce qui permet de retirer un bloc
 * du catalogue sans casser les pages qui le référencent encore, le temps que
 * leur contenu soit mis à jour.
 */
export const RenderContent = ({ data }: { data: Data }) => {
  const blocks = data.content ?? [];
  const isKnown = (i: number) =>
    i < blocks.length && blocks[i].type in puckConfig.components;

  return (
    <>
      {blocks.map((item, i) => {
        const def = puckConfig.components[item.type as keyof typeof puckConfig.components];
        if (!def) return null;

        // Un titre de section n'existe que pour annoncer le bloc qui le suit.
        // Si ce bloc a été retiré du catalogue, le titre reste seul, suspendu
        // au-dessus de la section suivante — c'est ce qui s'est passé avec
        // « Ce que disent les hôteliers » quand le bloc Témoignages a disparu.
        // On l'ignore aussi, sans attendre que le contenu soit republié.
        if (item.type === 'SectionHeading' && !isKnown(i + 1)) return null;

        const Comp = def.render as React.ComponentType<Record<string, unknown>>;
        const props = { ...(def.defaultProps as object), ...item.props };
        return <Comp key={(item.props as { id?: string }).id ?? i} {...props} />;
      })}
    </>
  );
};
