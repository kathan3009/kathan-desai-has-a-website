import CollectionEditor from "@/components/admin/CollectionEditor";

export default function Page() {
  return <CollectionEditor config={{
  "resource": "about",
  "title": "About",
  "singular": "question",
  "description": "Edit the questions and answers on your About page.",
  "fields": [
    {
      "key": "question",
      "label": "Question",
      "required": true
    },
    {
      "key": "answer",
      "label": "Answer",
      "required": true,
      "kind": "textarea"
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
    "question"
  ],
  "detailKeys": [
    "answer"
  ],
  "photos": false
}} />;
}
