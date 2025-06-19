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
            type: "object",
            title: "Colonne de filtre",
            properties: {
              name: {
                type: "string"
              },
              type: {
                type: "string"
              }
            },
            layout: {
              getItems: {
                url: "${context.catalogConfig.url}/catalog/datasets/${context.resourceId}?select=fields",
                itemsResults: "data.fields",
                itemTitle: "item.name",
                itemKey: "item.name",
              }
            },
            additionalProperties: true,
          },
          valeurs: {
            type: "array",
            title: "Valeurs",
            layout: {
              getItems: {
                url: "${context.catalogConfig.url}/catalog/datasets/${context.resourceId}/facets?facet=${parent.data?.field?.name}",
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