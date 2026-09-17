import { createFileRoute } from '@tanstack/react-router'
// @ts-ignore
import { env } from 'cloudflare:workers'
import { db } from '#/db'
import { documents } from '#/db/schema'
import { auth } from '#/lib/auth'
import {
  validateFileMagicBytes,
  type SupportedFileType,
} from '#/lib/document-processor'
import { eq, and } from 'drizzle-orm'

export const Route = createFileRoute('/api/documents/$id/upload')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          const { id } = params
          const session = await auth.api.getSession({ headers: request.headers })
          if (!session?.user) {
            return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const doc = await db.query.documents.findFirst({
            where: and(eq(documents.id, id), eq(documents.userId, session.user.id)),
          })

          if (!doc) {
            return new Response(JSON.stringify({ error: 'Document record not found.' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const bucket = (env as any)?.DOCUMENTS_BUCKET || (globalThis as any).DOCUMENTS_BUCKET
          if (!bucket) {
            return new Response(
              JSON.stringify({ error: 'Storage bucket is not bound on the server.' }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
          }

          if (!request.body) {
            return new Response(JSON.stringify({ error: 'Request body is empty.' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // Determine content-type header
          const mimeTypes: Record<string, string> = {
            pdf: 'application/pdf',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          }

          // Stream upload directly to R2
          await bucket.put(doc.r2Key, request.body, {
            httpMetadata: {
              contentType: mimeTypes[doc.fileType] || 'application/octet-stream',
            },
          })

          // Validate uploaded object in R2 and verify magic bytes
          const storedObject = await bucket.get(doc.r2Key)
          if (!storedObject) {
            throw new Error('Verification failed: object missing from storage.')
          }

          const buffer = await storedObject.arrayBuffer()
          const validation = await validateFileMagicBytes(
            buffer,
            doc.fileType as SupportedFileType
          )

          if (!validation.valid) {
            await bucket.delete(doc.r2Key)
            await db
              .update(documents)
              .set({
                status: 'failed',
                errorMessage: validation.error || 'Invalid file format.',
                updatedAt: new Date(),
              })
              .where(eq(documents.id, id))

            return new Response(
              JSON.stringify({ error: validation.error || 'Invalid file content.' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Mark status as uploaded in D1
          await db
            .update(documents)
            .set({
              status: 'uploaded',
              fileSize: buffer.byteLength,
              updatedAt: new Date(),
            })
            .where(eq(documents.id, id))

          // Push job to Cloudflare Queue for asynchronous document processing
          const queue =
            (env as any)?.DOCUMENT_QUEUE || (globalThis as any).DOCUMENT_QUEUE
          if (queue) {
            await queue.send({ documentId: id })
          } else {
            console.warn('DOCUMENT_QUEUE binding not detected; queue send skipped.')
          }

          return new Response(
            JSON.stringify({
              success: true,
              documentId: id,
              status: 'uploaded',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (err: any) {
          console.error('Document upload error:', err)
          return new Response(
            JSON.stringify({ error: err.message || 'Upload failed.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})
