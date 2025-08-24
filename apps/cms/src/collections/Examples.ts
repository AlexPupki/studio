import { CollectionConfig } from 'payload/types'

export const Examples: CollectionConfig = {
  slug: 'examples',
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
  ],
}
