import CollectionEditor from "@/components/admin/CollectionEditor";

export default function Page() {
  return <CollectionEditor config={{
  "resource": "work",
  "title": "Work",
  "singular": "experience",
  "description": "Your roles, companies, and work history.",
  "fields": [
    {
      "key": "company",
      "label": "Company",
      "required": true
    },
    {
      "key": "role",
      "label": "Role",
      "required": true
    },
    {
      "key": "period",
      "label": "Period",
      "required": true,
      "hint": "For example, 2020 \u2013 Present."
    },
    {
      "key": "description",
      "label": "Description",
      "required": false,
      "kind": "textarea"
    },
    {
      "key": "url",
      "label": "Website URL"
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
    "role",
    "company"
  ],
  "detailKeys": [
    "period",
    "description"
  ],
  "photos": false
}} />;
}
