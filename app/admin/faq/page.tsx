import CollectionEditor from "@/components/admin/CollectionEditor";

export default function Page() {
  return <CollectionEditor config={{
  "resource": "faq",
  "title": "FAQ",
  "singular": "question",
  "description": "Keep answers clear and useful. Aim for 40\u201360 words per answer.",
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
