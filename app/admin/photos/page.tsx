import CollectionEditor from "@/components/admin/CollectionEditor";

export default function Page() {
  return <CollectionEditor config={{
  "resource": "photos",
  "title": "Photographs",
  "singular": "photograph",
  "description": "Manage your gallery using image URLs from Uploads or your existing media.",
  "fields": [
    {
      "key": "image",
      "label": "Image URL",
      "required": true
    },
    {
      "key": "caption",
      "label": "Caption",
      "required": false,
      "kind": "textarea"
    },
    {
      "key": "category",
      "label": "Category"
    },
    {
      "key": "order",
      "label": "Display order",
      "kind": "number",
      "required": true,
      "hint": "Lower numbers appear first."
    }
  ],
  "titleKeys": [
    "caption"
  ],
  "detailKeys": [
    "category"
  ],
  "photos": true
}} />;
}
