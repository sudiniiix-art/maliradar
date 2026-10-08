package com.maliradar.app;

import android.app.Activity;
import android.os.CancellationSignal;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import java.security.SecureRandom;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {

    private static final String APP_URL = "https://maliradar.onrender.com/";
    private static final int FILE_CHOOSER_REQUEST = 4201;

    private WebView webView;
    private ValueCallback<Uri[]> pendingFileCallback;
    private CredentialManager credentialManager;
    private final ExecutorService authExecutor = Executors.newSingleThreadExecutor();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        configureWebView();
        credentialManager = CredentialManager.create(this);
        webView.loadUrl(APP_URL);
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();

        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.addJavascriptInterface(new StockCrashNativeAuth(), "StockCrashNativeAuth");
        webView.setWebViewClient(new MaliRadarWebViewClient());
        webView.setWebChromeClient(new MaliRadarChromeClient());
        webView.setDownloadListener(new MaliRadarDownloadListener());
    }

    private boolean isMaliRadarHost(Uri uri) {
        String host = uri.getHost();
        return host != null &&
                (host.equals("maliradar.onrender.com") || host.endsWith(".maliradar.onrender.com"));
    }

    private void openExternal(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
        } catch (ActivityNotFoundException ignored) {
            Toast.makeText(this, "No app can open this link.", Toast.LENGTH_SHORT).show();
        }
    }

    private final class StockCrashNativeAuth {
        @JavascriptInterface
        public boolean isConfigured() {
            return BuildConfig.GOOGLE_SERVER_CLIENT_ID != null && !BuildConfig.GOOGLE_SERVER_CLIENT_ID.trim().isEmpty();
        }

        @JavascriptInterface
        public void signInWithGoogle() {
            if (!isConfigured()) {
                postAuthResult(false, "", "", "Google sign-in is not configured in this Android build yet.");
                return;
            }
            final String nonce = createNonce();
            final GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_SERVER_CLIENT_ID)
                    .setNonce(nonce)
                    .build();
            final GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(option)
                    .build();
            runOnUiThread(() -> credentialManager.getCredentialAsync(
                    MainActivity.this,
                    request,
                    (CancellationSignal) null,
                    authExecutor,
                    new androidx.credentials.CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse response) {
                            Credential credential = response.getCredential();
                            try {
                                if (!(credential instanceof CustomCredential)) throw new IllegalStateException("Unsupported Google credential");
                                CustomCredential custom = (CustomCredential) credential;
                                if (!GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(custom.getType())) {
                                    throw new IllegalStateException("Unsupported Google credential type");
                                }
                                GoogleIdTokenCredential google = GoogleIdTokenCredential.createFrom(custom.getData());
                                postAuthResult(true, google.getIdToken(), nonce, "");
                            } catch (Exception e) {
                                postAuthResult(false, "", "", "Google sign-in response could not be read.");
                            }
                        }
                        @Override public void onError(GetCredentialException e) {
                            postAuthResult(false, "", "", "Google sign-in was cancelled or could not be completed.");
                        }
                    }
            ));
        }

        private String createNonce() {
            byte[] bytes = new byte[32];
            new SecureRandom().nextBytes(bytes);
            return Base64.encodeToString(bytes, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        }

        private void postAuthResult(boolean ok, String idToken, String nonce, String error) {
            String js = "window.StockCrashGoogleAuthResult({"
                    + "\"ok\":" + ok
                    + ",\"idToken\":" + quote(idToken)
                    + ",\"nonce\":" + quote(nonce)
                    + ",\"error\":" + quote(error)
                    + "});";
            runOnUiThread(() -> webView.evaluateJavascript(js, null));
        }

        private String quote(String value) {
            String s = value == null ? "" : value;
            return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r") + "\"";
        }
    }

    private final class MaliRadarWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();

            if ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme())) {
                if (isMaliRadarHost(uri)) {
                    return false;
                }
                openExternal(uri);
                return true;
            }

            openExternal(uri);
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
        }
    }

    private final class MaliRadarChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> filePathCallback,
                FileChooserParams fileChooserParams
        ) {
            if (pendingFileCallback != null) {
                pendingFileCallback.onReceiveValue(null);
            }

            pendingFileCallback = filePathCallback;

            Intent intent;
            try {
                intent = fileChooserParams.createIntent();
            } catch (Exception e) {
                intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.setType("*/*");
                intent.addCategory(Intent.CATEGORY_OPENABLE);
            }

            try {
                startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                return true;
            } catch (ActivityNotFoundException e) {
                pendingFileCallback = null;
                Toast.makeText(MainActivity.this, "File picker unavailable.", Toast.LENGTH_SHORT).show();
                return false;
            }
        }
    }

    private final class MaliRadarDownloadListener implements DownloadListener {
        @Override
        public void onDownloadStart(
                String url,
                String userAgent,
                String contentDisposition,
                String mimeType,
                long contentLength
        ) {
            openExternal(Uri.parse(url));
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (pendingFileCallback != null) {
                Uri[] results = null;

                if (resultCode == RESULT_OK && data != null) {
                    if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    } else if (data.getData() != null) {
                        results = new Uri[]{data.getData()};
                    }
                }

                pendingFileCallback.onReceiveValue(results);
                pendingFileCallback = null;
            }
        }

        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        authExecutor.shutdownNow();
        if (webView != null) {
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
