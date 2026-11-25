// Shared exact write-route policy. Unrelated APIs must never have bodies consumed.
export function creatorRoute(pathname,method='GET'){
 const path=pathname.split('?')[0].replace(/\/$/,'');
 const routes=[
 [/^\/api\/v1\/account\/export$/,['GET']],
 [/^\/api\/v1\/account\/delete-private$/,['POST']],
 [/^\/api\/v1\/auth\/(nonce|verify|logout|logout-all)$/,['POST']],
 [/^\/api\/v1\/auth\/session$/,['GET']],
 [/^\/api\/v1\/profile$/,['GET','PUT','DELETE']],
 [/^\/api\/v1\/profile\/export$/,['GET']],
 [/^\/api\/v1\/storage\/capabilities$/,['GET']],
 [/^\/api\/v1\/launches$/,['GET']],
 [/^\/api\/v1\/launches\/register$/,['POST']],
 [/^\/api\/v1\/launch-drafts$/,['GET','POST']],
 [/^\/api\/v1\/launch-drafts\/[a-f0-9]{64}$/,['GET','PATCH','DELETE']],
 [/^\/api\/v1\/favorites$/,['GET','PUT']],
 [/^\/api\/v1\/favorites\/0x[\da-fA-F]{40}$/,['PUT','DELETE']],
 [/^\/api\/v1\/reports$/,['POST']],
 [/^\/api\/v1\/collections\/0x[\da-fA-F]{40}$/,['GET']],
 [/^\/api\/v1\/collections\/0x[\da-fA-F]{40}\/presentation$/,['PATCH']],
 [/^\/api\/v1\/uploads$/,['POST']],
 [/^\/api\/v1\/uploads\/[a-f0-9]{64}$/,['GET']],
 [/^\/api\/v1\/uploads\/[a-f0-9]{64}\/files$/,['PUT']]
 ];
 const route=routes.find(([re])=>re.test(path));return {owned:!!route,allowed:!!route?.[1].includes(method)};
}
