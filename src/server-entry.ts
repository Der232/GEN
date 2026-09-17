// @ts-ignore
import serverEntry from '@tanstack/react-start/server-entry'
import { processDocumentQueue } from '#/lib/document-processor'

export default {
  fetch: (request: Request, env: any, ctx: any) => serverEntry.fetch(request, env, ctx),
  async queue(batch: any, env: any) {
    await processDocumentQueue(batch, env)
  },
}
