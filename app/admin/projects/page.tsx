import CollectionEditor from "@/components/admin/CollectionEditor";

export default function Page() {
  return <CollectionEditor config={{
  "resource": "projects",
  "title": "Projects",
  "singular": "project",
  "description": "Edit your project descriptions, links, and technology stacks.",
  "fields": [
    {
      "key": "name",
      "label": "Name",
      "required": true
    },
    {
      "key": "description",
      "label": "Description",
      "required": true,
      "kind": "textarea"
    },
    {
      "key": "techStack",
      "label": "Technology stack",
      "required": false,
      "kind": "list",
      "hint": "Separate technologies with commas."
    },
    {
      "key": "repoUrl",
      "label": "Repository URL"
    },
    {
      "key": "liveUrl",
      "label": "Live URL"
    },
    {
      "key": "image",
      "label": "Image URL"
    },
    {
      "key": "type",
      "label": "Project type",
      "required": true,
      "options": [
        {
          "value": "other",
          "label": "Other"
        },
        {
          "value": "py",
          "label": "Python"
        }
      ]
    },
    {
      "key": "status",
      "label": "Status",
      "required": true,
      "options": [
        {"value":"active","label":"Active"},
        {"value":"in-development","label":"In development"},
        {"value":"production","label":"Production"},
        {"value":"beta","label":"Beta"},
        {"value":"prototype","label":"Prototype"},
        {"value":"concept","label":"Concept"},
        {"value":"archived","label":"Archived"}
      ]
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
    "status",
    "type",
    "techStack"
  ],
  "photos": false
}} />;
}
