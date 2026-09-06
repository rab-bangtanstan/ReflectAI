# ReflectAI — User-Authenticated Journal & Reflection Assistant

A full-stack, user-authenticated journaling and reflection assistant powered by Google Gemini 3.6 Flash and Cloud Firestore with strictly isolated user document security.

---

## 1. Environment & Prerequisites

Ensure the following Google Cloud APIs and services are enabled in your project:
- **Cloud Run API** (`run.googleapis.com`)
- **Secret Manager API** (`secretmanager.googleapis.com`)
- **Cloud Firestore API** (`firestore.googleapis.com`)
- **Firebase Authentication**

### Local Prerequisites
- [Google Cloud SDK (`gcloud` CLI)](https://cloud.google.com/sdk/docs/install)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)
- Node.js 20+

---

## 2. Secret Management Setup

Store your Gemini API key in Google Cloud Secret Manager to prevent exposure in client code or source control:

```bash
# Set your Google Cloud project ID
gcloud config set project YOUR_PROJECT_ID

# Create the GEMINI_API_KEY secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Populate the secret with your Gemini API Key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Retrieve your project number
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

# Grant the Cloud Run default runtime service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration (Cloud Firestore)

Deploy the user-isolated security rules to Firestore to enforce data ownership and prevent unauthorized cross-user reading:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Deploy the rules using Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Cloud Run Deployment Flow

Build and deploy the full-stack container to Cloud Run:

```bash
# Build and deploy service to Cloud Run
gcloud run deploy reflect-ai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000
```

---

## 5. Required Campaign Labeling & Verification Binding

Apply the mandatory challenge label to register the service for verification:

```bash
gcloud run services update reflect-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Stability & Walkthrough Test Cases

### Test Case 1: Landing Page & Authentication
- **Step 1.1**: Visit the app root URL. Confirm that the landing page displays the sign-in hero and feature overview.
- **Step 1.2**: Click `Continue with Google` (or `Explore as Guest`). Confirm successful authentication and transition to the private reflection dashboard.
- **Step 1.3**: Verify that the top navigation displays the authenticated user's ID and avatar.

### Test Case 2: Multi-Turn Journal Dialogue & Gemini 3.6 Processing
- **Step 2.1**: In the reflection workspace, type a prompt (e.g. *"I want to reflect on my goals for this quarter"*).
- **Step 2.2**: Press **Enter** or click the **Send** button.
- **Step 2.3**: Verify that the prompt appears immediately as a user bubble and Gemini responds with structured insights and reflective follow-up questions.
- **Step 2.4**: Type a follow-up response (e.g. *"Let's brainstorm 3 actionable habits for morning focus"*). Confirm multi-turn continuity.

### Test Case 3: Firestore Isolation & Persistence
- **Step 3.1**: Check the sidebar list. Confirm that the new entry appears with its category and mood pill.
- **Step 3.2**: Click `Brainstorm Angles` or `Synthesize Summary`. Confirm generated content is stored in the entry.
- **Step 3.3**: Refresh the browser page. Confirm that the full conversation and reflections load cleanly from Firestore/local cache.
- **Step 3.4**: Click `Sign Out` and log in as another user/guest. Confirm the previous user's reflections are inaccessible.
