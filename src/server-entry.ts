import serverEntry from "@tanstack/react-start/server-entry";
import { processDocumentQueue } from "#/lib/document-processor";

export default {
	fetch: (request: Request, env: any) => serverEntry.fetch(request, env),
	async queue(batch: any, env: any) {
		await processDocumentQueue(batch, env);
	},
};
