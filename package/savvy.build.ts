import { build } from "@savvy-web/bundler";

await build({
	meta: {
		localPaths: ["../website/lib/models/package"],
		tsdoc: {
			suppressWarnings: [{ messageId: "ae-forgotten-export", pattern: "_base" }],
		},
	},
});
