/** Email-client-friendly tables and inline styles; no remote assets or tracking. */
export function resetEmailTemplate(code: string) {
  if (!/^\d{6}$/.test(code)) throw new Error("Invalid verification code format.");
  return {
    subject: "Reset your password | rolelens.",
    text: `rolelens.\n\nReset your password\n\nEnter this verification code in the RoleLens password-reset window:\n\n${code}\n\nThis code expires in 10 minutes and can only be used once.\n\nNever share this code. RoleLens will never ask you to send it by email.\nIf you didn't request a password reset, you can ignore this email. Your password hasn't changed.\n\nYour career. Your data.\nrolelens.`,
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset your password</title></head>
<body style="margin:0;padding:0;background-color:#f4f7f1;font-family:Arial,Helvetica,sans-serif;color:#202922;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">Your password-reset code is valid for 10 minutes. Never share it.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f7f1;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;background-color:#ffffff;border:1px solid #e0e7dc;border-radius:16px;">
<tr><td style="padding:28px 28px 24px;border-bottom:1px solid #e7ece2;">
<div style="font-size:30px;line-height:36px;font-weight:700;letter-spacing:-1px;color:#174c3c;">rolelens<span style="color:#87a771;">.</span></div>
<div style="margin-top:6px;font-size:12px;line-height:18px;letter-spacing:2px;color:#697760;">YOUR NEXT CHAPTER</div>
</td></tr>
<tr><td style="padding:30px 28px;">
<h1 style="margin:0 0 14px;font-size:26px;line-height:34px;font-weight:600;color:#202922;">Reset your password</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:25px;color:#596554;">Let's get you back to your workspace. Enter the code below in the password-reset window.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:22px 12px;background-color:#edf3e7;border:1px solid #dce7d2;border-radius:10px;">
<div style="margin-bottom:10px;font-size:12px;line-height:18px;letter-spacing:1.5px;color:#526549;">YOUR VERIFICATION CODE</div>
<div style="font-family:Consolas,'Courier New',monospace;font-size:34px;line-height:44px;letter-spacing:6px;font-weight:700;color:#174c3c;white-space:nowrap;">${code}</div>
</td></tr></table>
<p style="margin:16px 0 26px;text-align:center;font-size:14px;line-height:22px;color:#596554;">Expires in <strong>10 minutes</strong> &middot; One-time use</p>
<p style="margin:0 0 10px;font-size:14px;line-height:23px;color:#344730;"><strong>Keep this code private.</strong> RoleLens will never ask you to send it by email.</p>
<p style="margin:0;font-size:14px;line-height:23px;color:#697760;">Didn't request this? You can ignore this email. Your password hasn't changed.</p>
</td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid #e7ece2;font-size:12px;line-height:20px;color:#697760;">Your career. Your data.<br><strong style="color:#174c3c;">rolelens.</strong> &nbsp; Account security</td></tr>
</table></td></tr></table></body></html>`,
  };
}
