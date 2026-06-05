// UI strings — English only. One source of truth so a future i18n pass has
// somewhere to swap from. Keep keys grouped by feature.

export const STRINGS = {
    app: {
        title: "ObjectBuilder-JS",
        subtitle: "Stage 1 — UI shell (mock data)",
    },

    menu: {
        file: {
            label: "File",
            items: {
                new: "New",
                open: "Open…",
                compile: "Compile",
                compileAs: "Compile As…",
                close: "Close",
                merge: "Merge…",
                preferences: "Preferences…",
                exit: "Exit",
            },
        },
        edit: {
            label: "Edit",
            items: {
                undo: "Undo",
                redo: "Redo",
            },
        },
        view: {
            label: "View",
            items: {
                showPreview: "Show Preview Panel",
                showObjects: "Show Object List",
                showSprites: "Show Sprite List",
            },
        },
        tools: {
            label: "Tools",
            items: {
                find: "Find…",
                lookGenerator: "Look Type Generator",
                objectViewer: "Object Viewer",
                slicer: "Slicer",
                animationEditor: "Animation Editor",
                spritesOptimizer: "Sprites Optimizer",
            },
        },
        window: {
            label: "Window",
            items: {
                log: "Log",
                versions: "Versions…",
            },
        },
        help: {
            label: "Help",
            items: {
                contents: "Contents",
                checkForUpdates: "Check for Updates",
                about: "About",
            },
        },
    },

    toolbar: {
        new: "New",
        open: "Open",
        compile: "Compile",
        save: "Save",
        find: "Find",
        undo: "Undo",
        redo: "Redo",
    },

    panels: {
        preview: "Preview",
        objects: "Objects",
        sprites: "Sprites",
        editor: "Editor",
    },

    categories: {
        item: "Item",
        outfit: "Outfit",
        effect: "Effect",
        missile: "Missile",
    },

    editor: {
        tabs: {
            texture: "Texture",
            properties: "Properties",
            flags: "Flags",
        },
        save: "Save",
        close: "Close",
    },

    statusBar: {
        ready: "Ready",
    },
};
