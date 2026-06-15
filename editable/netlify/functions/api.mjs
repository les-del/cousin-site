import { handleApiRequest } from '../../server/api-handler.mjs';

export async function handler(event) {
  const result = await handleApiRequest({
    method: event.httpMethod,
    path: event.path,
    headers: event.headers,
    body: event.body,
    isBase64Encoded: event.isBase64Encoded,
  });

  return {
    statusCode: result.status,
    headers: result.headers,
    body: result.body,
  };
}
