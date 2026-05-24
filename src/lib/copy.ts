// All UI strings in one place — single source of truth, i18n-ready.
// Follows the SITELY copy rules: active voice, present tense, no "please",
// no "successfully", verbs on buttons, empty states as invitations.

export const copy = {
  editor: {
    autosave: {
      saving: "Saving…",
      saved: "Saved",
      offline: "Saved locally",
      error: "Save failed — changes are stored locally",
    },
    emptyCanvas: {
      title: "Start with a block",
      subtitle: "Drag from the library or press ⌘K to search",
      cta: "Browse blocks",
    },
    blockLibrary: {
      searchPlaceholder: "Search blocks…",
      emptySearch: 'No blocks match "{query}"',
    },
    undo: {
      nothingToUndo: "Nothing to undo",
      nothingToRedo: "Nothing to redo",
    },
  },
  publish: {
    dialog: {
      title: "Publish your site",
      subtitle: "Your changes will be live immediately",
      cta: "Publish now",
      success: {
        title: "Your site is live",
        subtitle: "Share it with the world",
      },
    },
    checklist: {
      seo: { pass: "SEO title set", fail: "Add an SEO title" },
      favicon: { pass: "Favicon configured", fail: "Upload a favicon" },
      mobile: { pass: "Mobile-friendly", fail: "Test on mobile" },
      speed: { pass: "Performance looks good", fail: "Some images are large" },
    },
  },
  errors: {
    generic: "Something went wrong. Try again.",
    offline: "You're offline. Changes are saved locally.",
    notFound: "This page doesn't exist.",
    unauthorized: "Sign in to access this.",
    rateLimited: "Too many requests. Wait a moment and try again.",
    aiTimeout: "AI took too long. Try a shorter prompt.",
  },
  ai: {
    thinking: "Thinking…",
    generating: "Generating your content…",
    almostDone: "Almost ready…",
    tryAgain: "Generation failed. Try rephrasing your prompt.",
    placeholder: "Describe what you want to build…",
    examples: [
      "A hero section for a law firm with a professional tone",
      "A 3-column features grid for a project management app",
      "A pricing section with 3 tiers, monthly/annual toggle",
    ],
  },
} as const;

export type Copy = typeof copy;
