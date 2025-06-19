/* eslint-disable */

export const importConfigSchema: Record<string, any> = {
  type: "object",
  properties: {
    filters: {
      type: "array",
      title: "Filtres de l'imports",
      default: [],
      items: {
        type: "object",
        title: "Filtre",
        properties: {
          field: {
            type: "string",
            title: "Colonne de filtre",
            layout: {
              getItems: {
                url: "https://opendata.agenceore.fr/api/explore/v2.1/catalog/datasets/nombre-installation-production-stockage-electricite-31122019?select=fields",
                itemsResults: "data.fields",
                itemTitle: "item.name",
                itemKey: "item.name"
              }
            }
          },
          valeurs: {
            type: "array",
            title: "Valeurs",
            layout: {
              getItems: {
                url: "https://opendata.agenceore.fr/api/explore/v2.1/catalog/datasets/nombre-installation-production-stockage-electricite-31122019/facets?facet=${parent.data?.field}",
                itemsResults: "data.facets[0].facets",
                itemTitle: "item.name",
                itemKey: "item.name"
              }
            },
            items: {
              type: "object",
              additionalProperties: true,
              properties: {
                name: {
                  type: "string"
                }
              }
            }
          }
        }
      }
    }
  }
}