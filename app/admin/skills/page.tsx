import CollectionEditor from "@/components/admin/CollectionEditor";

export default function Page() {
  return <CollectionEditor config={{
  "resource": "skills",
  "title": "Skills",
  "singular": "skill",
  "description": "Manage the skills and categories shown on your site.",
  "fields": [
    {
      "key": "name",
      "label": "Name",
      "required": true
    },
    {
      "key": "category",
      "label": "Category",
      "required": true,
      "hint": "For example, Languages or Tools."
    },
    {
      "key": "icon",
      "label": "Icon"
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
    "name"
  ],
  "detailKeys": [
    "category",
    "icon"
  ],
  "photos": false
}} />;
}
