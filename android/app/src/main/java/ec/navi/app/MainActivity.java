package ec.navi.app;

import android.Manifest;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.telephony.SmsManager;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.net.Uri;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.nfc.tech.NdefFormatable;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;

public class MainActivity extends Activity implements NfcAdapter.ReaderCallback {
    private static final String START = "file:///android_asset/start.html";
    private static final String DEMO = "file:///android_asset/demo.html";
    private static final int FILE_REQUEST = 42;
    private static final int SMS_REQUEST = 77;
    private static final String SMS_SENT = "ec.navi.app.SMS_SENT";
    private static final String VERSION = "3.10";

    private WebView web;
    private NfcAdapter nfc;
    private SharedPreferences prefs;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingId;
    private String pendingMode;
    private String pendingArg;
    private BroadcastReceiver smsReceiver;
    private final HashMap<String, int[]> smsParts = new HashMap<String, int[]>();

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        prefs = getSharedPreferences("navi", MODE_PRIVATE);
        nfc = NfcAdapter.getDefaultAdapter(this);
        paintBars();

        web = new WebView(this);
        web.setBackgroundColor(isNight() ? 0xFF000000 : 0xFFF2F2F7);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(Math.max(100, Math.min(118, Math.round(getResources().getConfiguration().fontScale * 100))));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        s.setUserAgentString(s.getUserAgentString() + " NaviAndroid/" + VERSION);
        web.addJavascriptInterface(new Bridge(), "NaviAndroid");
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String agent, String disposition, String mime, long length) {
                openExternal(url);
            }
        });
        setContentView(web);

        String server = prefs.getString("server", "");
        if (state != null) web.restoreState(state);
        else if (prefs.getBoolean("demo", false)) web.loadUrl(DEMO);
        else web.loadUrl(server.length() > 0 ? server + "/" : START);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (web != null) web.saveState(out);
    }

    private boolean isNight() {
        return (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    }

    private void paintBars() {
        Window w = getWindow();
        boolean night = isNight();
        w.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        w.setStatusBarColor(night ? 0xFF000000 : 0xFFF2F2F7);
        w.setNavigationBarColor(night ? 0xFF000000 : 0xFFF2F2F7);
        int flags = 0;
        if (!night) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= 26) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        w.getDecorView().setSystemUiVisibility(flags);
    }

    @Override
    public void onConfigurationChanged(Configuration c) {
        super.onConfigurationChanged(c);
        paintBars();
    }

    private String serverHost() {
        String server = prefs.getString("server", "");
        if (server.length() == 0) return "";
        Uri u = Uri.parse(server);
        return u.getHost() == null ? "" : u.getHost();
    }

    private void openExternal(String url) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            web.evaluateJavascript("window.dispatchEvent(new CustomEvent('navi-native-error',{detail:'No hay una app para abrir este enlace'}))", null);
        }
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri u = request.getUrl();
            String scheme = u.getScheme() == null ? "" : u.getScheme();
            if (scheme.equals("file")) return false;
            if ((scheme.equals("http") || scheme.equals("https")) && u.getHost() != null && u.getHost().equals(serverHost())) return false;
            openExternal(u.toString());
            return true;
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame() && !request.getUrl().toString().startsWith("file:")) view.loadUrl(START + "#sin-conexion");
        }
    }

    private class Chrome extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            try {
                startActivityForResult(params.createIntent(), FILE_REQUEST);
            } catch (Exception e) {
                fileCallback = null;
                return false;
            }
            return true;
        }
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == FILE_REQUEST && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            fileCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (web == null) {
            super.onBackPressed();
            return;
        }
        web.evaluateJavascript("(window.naviBack&&window.naviBack())?'1':'0'", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String v) {
                if ("\"1\"".equals(v)) return;
                if (web.canGoBack()) web.goBack();
                else moveTaskToBack(true);
            }
        });
    }

    private void tint(final int color, final boolean light) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Window w = getWindow();
                w.setStatusBarColor(color);
                w.setNavigationBarColor(color);
                int flags = 0;
                if (light) {
                    flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    if (Build.VERSION.SDK_INT >= 26) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                }
                w.getDecorView().setSystemUiVisibility(flags);
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (pendingId != null) enableReader();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (nfc != null) {
            try {
                nfc.disableReaderMode(this);
            } catch (Exception e) {
            }
        }
    }

    private void enableReader() {
        if (nfc == null) return;
        int flags = NfcAdapter.FLAG_READER_NFC_A | NfcAdapter.FLAG_READER_NFC_B | NfcAdapter.FLAG_READER_NFC_F | NfcAdapter.FLAG_READER_NFC_V;
        nfc.enableReaderMode(this, this, flags, new Bundle());
    }

    private void stopReader() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (nfc != null) {
                    try {
                        nfc.disableReaderMode(MainActivity.this);
                    } catch (Exception e) {
                    }
                }
            }
        });
    }

    private void start(final String id, final String mode, final String arg) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (nfc == null) {
                    reply(id, error("Este celular no tiene NFC", "NO_NFC"));
                    return;
                }
                if (!nfc.isEnabled()) {
                    reply(id, error("Activa el NFC en los ajustes del celular", "NFC_OFF"));
                    return;
                }
                String old;
                synchronized (MainActivity.this) {
                    old = pendingId;
                    pendingId = id;
                    pendingMode = mode;
                    pendingArg = arg;
                }
                if (old != null) reply(old, error("Cancelado", "AbortError"));
                enableReader();
            }
        });
    }

    @Override
    public void onTagDiscovered(Tag tag) {
        String id;
        String mode;
        String arg;
        synchronized (this) {
            id = pendingId;
            mode = pendingMode;
            arg = pendingArg;
            pendingId = null;
        }
        if (id == null) return;
        String uid = hex(tag.getId());
        String result;
        try {
            result = "write".equals(mode) ? write(tag, uid, arg) : read(tag, uid);
        } catch (Exception e) {
            result = error(e.getMessage() == null ? "La tarjeta se movió. Intenta otra vez." : e.getMessage(), "NfcError");
        }
        reply(id, result);
        stopReader();
    }

    private String read(Tag tag, String uid) throws Exception {
        JSONObject out = new JSONObject();
        JSONArray list = new JSONArray();
        out.put("uid", uid);
        Ndef ndef = Ndef.get(tag);
        if (ndef != null) {
            ndef.connect();
            try {
                NdefMessage msg = ndef.getNdefMessage();
                if (msg != null) {
                    for (NdefRecord r : msg.getRecords()) {
                        JSONObject item = record(r);
                        if (item != null) list.put(item);
                    }
                }
            } finally {
                ndef.close();
            }
        }
        out.put("records", list);
        return out.toString();
    }

    private JSONObject record(NdefRecord r) throws Exception {
        short tnf = r.getTnf();
        byte[] type = r.getType();
        if (tnf == NdefRecord.TNF_WELL_KNOWN && Arrays.equals(type, NdefRecord.RTD_URI)) {
            Uri u = r.toUri();
            if (u == null) return null;
            return new JSONObject().put("type", "url").put("data", u.toString());
        }
        if (tnf == NdefRecord.TNF_ABSOLUTE_URI) {
            return new JSONObject().put("type", "url").put("data", new String(type, Charset.forName("UTF-8")));
        }
        if (tnf == NdefRecord.TNF_WELL_KNOWN && Arrays.equals(type, NdefRecord.RTD_TEXT)) {
            byte[] p = r.getPayload();
            if (p.length < 1) return null;
            int lang = p[0] & 0x3F;
            boolean utf16 = (p[0] & 0x80) != 0;
            if (1 + lang > p.length) return null;
            String text = new String(p, 1 + lang, p.length - 1 - lang, Charset.forName(utf16 ? "UTF-16" : "UTF-8"));
            return new JSONObject().put("type", "text").put("data", text);
        }
        return null;
    }

    private String write(Tag tag, String uid, String arg) throws Exception {
        JSONObject in = new JSONObject(arg);
        String expect = in.optString("uid", "").replaceAll("[^0-9A-Fa-f]", "");
        if (expect.length() > 0 && !expect.equalsIgnoreCase(uid)) return error("Esa no es la tarjeta correcta (UID " + uid + ").", "WRONG_CARD");
        JSONArray recs = in.getJSONArray("records");
        NdefRecord[] arr = new NdefRecord[recs.length()];
        for (int i = 0; i < recs.length(); i++) {
            JSONObject r = recs.getJSONObject(i);
            String data = r.getString("data");
            arr[i] = "url".equals(r.optString("type")) ? NdefRecord.createUri(data) : NdefRecord.createTextRecord("es", data);
        }
        NdefMessage msg = new NdefMessage(arr);
        Ndef ndef = Ndef.get(tag);
        if (ndef != null) {
            ndef.connect();
            try {
                if (!ndef.isWritable()) return error("La tarjeta está protegida contra escritura", "READ_ONLY");
                if (ndef.getMaxSize() < msg.toByteArray().length) return error("La tarjeta es muy pequeña. Usa NTAG213 o NTAG215.", "TOO_SMALL");
                ndef.writeNdefMessage(msg);
            } finally {
                ndef.close();
            }
        } else {
            NdefFormatable f = NdefFormatable.get(tag);
            if (f == null) return error("Esta tarjeta no admite NDEF. Usa NTAG213 o NTAG215.", "NO_NDEF");
            f.connect();
            try {
                f.format(msg);
            } finally {
                f.close();
            }
        }
        return new JSONObject().put("uid", uid).toString();
    }

    private static String hex(byte[] b) {
        StringBuilder sb = new StringBuilder();
        if (b == null) return "";
        for (byte x : b) sb.append(String.format("%02X", x));
        return sb.toString();
    }

    private static String error(String message, String code) {
        try {
            return new JSONObject().put("error", message).put("code", code).toString();
        } catch (Exception e) {
            return "{\"error\":\"Error\"}";
        }
    }

    private void reply(final String id, final String json) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (web == null) return;
                web.evaluateJavascript("window.__naviNfc&&window.__naviNfc(" + JSONObject.quote(id) + "," + JSONObject.quote(json) + ")", null);
            }
        });
    }

    private void js(final String code) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (web != null) web.evaluateJavascript(code, null);
            }
        });
    }

    private boolean smsAllowed() {
        return Build.VERSION.SDK_INT < 23 || checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    private void smsDone(String id, boolean ok, String error) {
        js("window.naviSmsResult&&window.naviSmsResult(" + JSONObject.quote(id) + "," + ok + "," + JSONObject.quote(error == null ? "" : error) + ")");
    }

    private void ensureSmsReceiver() {
        if (smsReceiver != null) return;
        smsReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String id = intent.getStringExtra("id");
                if (id == null) return;
                int code = getResultCode();
                synchronized (smsParts) {
                    int[] st = smsParts.get(id);
                    if (st == null) return;
                    st[0]--;
                    if (code != Activity.RESULT_OK && st[1] == 0) st[1] = code == SmsManager.RESULT_ERROR_NO_SERVICE ? 2 : code == SmsManager.RESULT_ERROR_RADIO_OFF ? 3 : 1;
                    if (st[0] > 0) return;
                    smsParts.remove(id);
                    if (st[1] == 0) smsDone(id, true, null);
                    else smsDone(id, false, st[1] == 2 ? "El celular no tiene señal" : st[1] == 3 ? "El celular está en modo avión" : "El operador no aceptó el SMS (revisa el saldo o el plan)");
                }
            }
        };
        IntentFilter f = new IntentFilter(SMS_SENT);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(smsReceiver, f, Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(smsReceiver, f);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == SMS_REQUEST) js("window.naviSmsPermission&&window.naviSmsPermission(" + smsAllowed() + ")");
    }

    @Override
    protected void onDestroy() {
        if (smsReceiver != null) {
            try {
                unregisterReceiver(smsReceiver);
            } catch (Exception e) {
            }
            smsReceiver = null;
        }
        super.onDestroy();
    }

    private void go(final String url) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                web.clearHistory();
                web.loadUrl(url);
            }
        });
    }

    private class Bridge {
        @JavascriptInterface
        public boolean canSms() {
            return getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY);
        }

        @JavascriptInterface
        public boolean smsReady() {
            return canSms() && smsAllowed();
        }

        @JavascriptInterface
        public void requestSms() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (smsAllowed()) js("window.naviSmsPermission&&window.naviSmsPermission(true)");
                    else requestPermissions(new String[]{Manifest.permission.SEND_SMS}, SMS_REQUEST);
                }
            });
        }

        @JavascriptInterface
        public String deviceName() {
            String m = Build.MODEL == null ? "" : Build.MODEL;
            String b = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER;
            return m.toLowerCase().startsWith(b.toLowerCase()) ? m : (b + " " + m).trim();
        }

        @JavascriptInterface
        public void sendSms(final String id, final String phone, final String text) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (!smsAllowed()) {
                        smsDone(id, false, "Falta el permiso para enviar SMS en este celular");
                        return;
                    }
                    try {
                        ensureSmsReceiver();
                        SmsManager sm = Build.VERSION.SDK_INT >= 31 ? getSystemService(SmsManager.class) : SmsManager.getDefault();
                        ArrayList<String> parts = sm.divideMessage(text);
                        ArrayList<PendingIntent> sent = new ArrayList<PendingIntent>();
                        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
                        for (int i = 0; i < parts.size(); i++) {
                            Intent it = new Intent(SMS_SENT);
                            it.setPackage(getPackageName());
                            it.putExtra("id", id);
                            sent.add(PendingIntent.getBroadcast(MainActivity.this, (id + "#" + i).hashCode(), it, flags));
                        }
                        synchronized (smsParts) {
                            smsParts.put(id, new int[]{parts.size(), 0});
                        }
                        if (parts.size() == 1) sm.sendTextMessage(phone, null, text, sent.get(0), null);
                        else sm.sendMultipartTextMessage(phone, null, parts, sent, null);
                    } catch (Exception e) {
                        synchronized (smsParts) {
                            smsParts.remove(id);
                        }
                        smsDone(id, false, "No se pudo enviar: " + e.getMessage());
                    }
                }
            });
        }

        @JavascriptInterface
        public void nfcRead(String id, String arg) {
            start(id, "read", arg);
        }

        @JavascriptInterface
        public void nfcWrite(String id, String arg) {
            start(id, "write", arg);
        }

        @JavascriptInterface
        public void nfcStop() {
            String old;
            synchronized (MainActivity.this) {
                old = pendingId;
                pendingId = null;
            }
            if (old != null) reply(old, error("Cancelado", "AbortError"));
            stopReader();
        }

        @JavascriptInterface
        public boolean hasNfc() {
            return nfc != null;
        }

        @JavascriptInterface
        public String getServer() {
            return prefs.getString("server", "");
        }

        @JavascriptInterface
        public void setServer(String url) {
            String u = url == null ? "" : url.trim();
            if (u.length() == 0) return;
            if (!u.startsWith("http://") && !u.startsWith("https://")) u = "http://" + u;
            while (u.endsWith("/")) u = u.substring(0, u.length() - 1);
            prefs.edit().putString("server", u).remove("demo").apply();
            go(u + "/");
        }

        @JavascriptInterface
        public void resetServer() {
            prefs.edit().remove("server").remove("demo").apply();
            go(START);
        }

        @JavascriptInterface
        public void openDemo() {
            prefs.edit().putBoolean("demo", true).apply();
            go(DEMO);
        }

        @JavascriptInterface
        public void openExternal(String url) {
            MainActivity.this.openExternal(url);
        }

        @JavascriptInterface
        public String version() {
            return VERSION;
        }

        @JavascriptInterface
        public void setBars(String hex, boolean light) {
            try {
                tint(android.graphics.Color.parseColor(hex), light);
            } catch (Exception e) {
            }
        }

        @JavascriptInterface
        public void haptic(final int ms) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        web.performHapticFeedback(ms > 20 ? android.view.HapticFeedbackConstants.LONG_PRESS : android.view.HapticFeedbackConstants.KEYBOARD_TAP);
                    } catch (Exception e) {
                    }
                }
            });
        }
    }
}
