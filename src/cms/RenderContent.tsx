import type { Data } from '@measured/puck';
import { puckConfig } from './puckConfig';

/**
 * Rendu public d'un arbre Puck SANS la librairie Puck : le format Data est
 * une simple liste { content: [{ type, props }] } et nos blocs n'utilisent
 * pas de DropZones. Importer <Render> de @measured/puck ajoutait ~350 Ko au
 * bundle principal servi à chaque visiteur — l'éditeur (admin, lazy) reste
 * le seul consommateur de la lib.
 */
export const RenderContent = ({ data }: { data: Data }) => (
  <>
    {(data.content ?? []).map((item, i) => {
      const def = puckConfig.components[item.type as keyof typeof puckConfig.components];
      if (!def) return null;
      const Comp = def.render as React.ComponentType<Record<string, unknown>>;
      const props = { ...(def.defaultProps as object), ...item.props };
      return <Comp key={(item.props as { id?: string }).id ?? i} {...props} />;
    })}
  </>
);
