// Retired endpoint: existing clients cannot approve, reject or link students.
export const dynamic = 'force-dynamic';
function retired() {
 return Response.json({ error: 'Student registration no longer requires coordinator approval.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
export const GET = retired;
export const POST = retired;
