// Test-only mail server: accepts SMTP from the API under test and lets suites read what was "sent" over HTTP.
//   GET /mails?to=addr   -> [{raw}]      GET /otp?to=addr -> {code} (newest 6-digit code)     POST /clear
import net from 'net'; import http from 'http';
const mails = [];
const qp = (t) => t.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
const smtp = net.createServer((sock) => {
  let data = '', inData = false, buf = '', to = [];
  sock.write('220 sink ESMTP\r\n');
  sock.on('data', (c) => { buf += c; let i;
    while ((i = buf.indexOf('\r\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 2);
      if (inData) { if (line === '.') { inData = false; mails.push({ to: [...to], raw: qp(data) }); data = ''; to = []; sock.write('250 queued\r\n'); } else data += line + '\n'; continue; }
      const u = line.toUpperCase();
      if (u.startsWith('EHLO') || u.startsWith('HELO')) sock.write('250-sink\r\n250 AUTH PLAIN LOGIN\r\n');
      else if (u.startsWith('AUTH')) sock.write('235 ok\r\n');
      else if (u.startsWith('RCPT TO')) { to.push(line.replace(/^RCPT TO:\s*<?/i, '').replace(/>.*$/, '').toLowerCase()); sock.write('250 ok\r\n'); }
      else if (u.startsWith('DATA')) { inData = true; sock.write('354 go\r\n'); }
      else if (u.startsWith('QUIT')) { sock.write('221 bye\r\n'); sock.end(); }
      else sock.write('250 ok\r\n'); } });
});
smtp.listen(Number(process.env.SMTP_PORT || 4120), '127.0.0.1');
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); const to = (u.searchParams.get('to') || '').toLowerCase();
  const mine = mails.filter((m) => m.to.includes(to));
  res.setHeader('content-type', 'application/json');
  if (req.method === 'POST' && u.pathname === '/clear') { mails.length = 0; return res.end('{}'); }
  if (u.pathname === '/otp') { const m = [...mine].reverse().map((x) => x.raw.match(/\b(\d{6})\b/)).find(Boolean); return res.end(JSON.stringify({ code: m ? m[1] : null, count: mine.length })); }
  res.end(JSON.stringify(mine));
}).listen(Number(process.env.SINK_PORT || 4121), '127.0.0.1');
