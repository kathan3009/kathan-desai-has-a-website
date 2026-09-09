import CollectionEditor from "@/components/admin/CollectionEditor";

export default function Page() {
  return <CollectionEditor config={{
  "resource": "certifications",
  "title": "Certifications",
  "singular": "certification",
  "description": "Credentials, issuers, and verification links.",
  "fields": [
    {
      "key": "name",
      "label": "Name",
      "required": true
    },
    {
      "key": "issuer",
      "label": "Issuer",
      "required": true
    },
    {
      "key": "date",
      "label": "Date",
      "required": true,
      "hint": "For example, 2024."
    },
    {
      "key": "url",
      "label": "Verification URL"
    },
    {
      "key": "credentialId",
      "label": "Credential ID"
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
    "issuer",
    "date",
    "credentialId"
  ],
  "photos": false
}} />;
}
