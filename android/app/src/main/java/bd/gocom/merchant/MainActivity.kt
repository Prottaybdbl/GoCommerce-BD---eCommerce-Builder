package bd.gocom.merchant

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.util.Log
import android.webkit.*
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    companion object {
        private const val FILE_CHOOSER_REQUEST_CODE = 1001
        private const val CURRENT_VERSION_CODE = 100
        private const val TAG = "GoComMainActivity"

        // Permitted origins for native JavaScript bridge (Invariant #11)
        private val ALLOWED_ORIGINS = listOf(
            "app.yourbrand.com",
            "localhost:5173",
            "10.0.2.2:5173"
        )
    }

    private val defaultDashboardUrl = "https://app.yourbrand.com"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefreshLayout = findViewById(R.id.swipeRefresh)

        // Configure WebView settings for modern React 19 SPA
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            mediaPlaybackRequiresUserGesture = false
        }

        // Enable cookies for Better Auth session management
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        // 1. WebChromeClient with onShowFileChooser (Invariant #11)
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*"
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                }

                val chooserIntent = Intent.createChooser(intent, "পণ্যের ছবি নির্বাচন করুন")
                startActivityForResult(chooserIntent, FILE_CHOOSER_REQUEST_CODE)
                return true
            }
        }

        // 2. DownloadListener using DownloadManager for CSV exports and invoices (Invariant #11)
        webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, _ ->
            try {
                val request = DownloadManager.Request(Uri.parse(url)).apply {
                    setMimeType(mimetype)
                    addRequestHeader("User-Agent", userAgent)
                    addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url))
                    setDescription("Go Commerce BD ফাইল ডাউনলোড হচ্ছে...")
                    setTitle(URLUtil.guessFileName(url, contentDisposition, mimetype))
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS,
                        URLUtil.guessFileName(url, contentDisposition, mimetype)
                    )
                }

                val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                dm.enqueue(request)
                Toast.makeText(this, "ডাউনলোড শুরু হয়েছে...", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Log.e(TAG, "Download failed: ${e.message}")
                Toast.makeText(this, "ডাউনলোড ত্রুটি: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }

        // 3. Navigation and Deep Link Handling
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false

                // Open tel: and wa.me links in external phone / WhatsApp app
                if (url.startsWith("tel:") || url.startsWith("https://wa.me") || url.startsWith("whatsapp://")) {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                    return true
                }

                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                swipeRefreshLayout.isRefreshing = false
            }
        }

        swipeRefreshLayout.setOnRefreshListener {
            webView.reload()
        }

        // 4. Secure JS Bridge restricted strictly to platform origin (Invariant #11)
        webView.addJavascriptInterface(GoComWebAppInterface(this), "GoComNative")

        // 5. Check if opened from an FCM notification deep link with strict origin validation (Finding V-18)
        val targetOrderUrl = intent.getStringExtra("target_url")
        val safeUrl = if (!targetOrderUrl.isNullOrBlank()) {
            try {
                val parsed = Uri.parse(targetOrderUrl)
                val scheme = parsed.scheme?.lowercase()
                val host = parsed.host?.lowercase()
                val isHostAllowed = host != null && ALLOWED_ORIGINS.any { allowed -> host == allowed || host.endsWith(".$allowed") }
                if (scheme == "https" && isHostAllowed) {
                    targetOrderUrl
                } else {
                    Log.w(TAG, "Blocked unauthorized deep link destination: $targetOrderUrl")
                    defaultDashboardUrl
                }
            } catch (e: Exception) {
                Log.w(TAG, "Malformed deep link URL: ${e.message}")
                defaultDashboardUrl
            }
        } else {
            defaultDashboardUrl
        }
        webView.loadUrl(safeUrl)

        // 6. OEM Battery Autostart Optimization Guide (Xiaomi, Vivo, Oppo)
        BatteryOptimizationHelper.showAutostartGuideIfNeeded(this)

        // 7. In-App Update Check against /api/app/version (Invariant #11)
        checkForAppUpdates()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (fileUploadCallback != null) {
                val results: Array<Uri>? = when {
                    resultCode == RESULT_OK && data?.clipData != null -> {
                        val count = data.clipData!!.itemCount
                        Array(count) { i -> data.clipData!!.getItemAt(i).uri }
                    }
                    resultCode == RESULT_OK && data?.data != null -> {
                        arrayOf(data.data!!)
                    }
                    else -> null
                }
                fileUploadCallback?.onReceiveValue(results)
                fileUploadCallback = null
            }
        }
    }

    private fun checkForAppUpdates() {
        Thread {
            try {
                val url = URL("https://app.yourbrand.com/api/app/version")
                val conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 5000
                conn.readTimeout = 5000

                if (conn.responseCode == 200) {
                    val response = conn.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(response)
                    val data = json.getJSONObject("data")
                    val latestCode = data.getInt("versionCode")
                    val latestName = data.getString("versionName")
                    val downloadUrl = data.getString("downloadUrl")
                    val releaseNotes = data.optString("releaseNotes", "নতুন আপডেট পাওয়া গেছে।")
                    val forceUpdate = data.optBoolean("forceUpdate", false)

                    if (latestCode > CURRENT_VERSION_CODE) {
                        runOnUiThread {
                            promptUpdateDialog(latestName, downloadUrl, releaseNotes, forceUpdate)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.d(TAG, "Update check skipped or offline: ${e.message}")
            }
        }.start()
    }

    private fun promptUpdateDialog(versionName: String, downloadUrl: String, notes: String, forceUpdate: Boolean) {
        val builder = AlertDialog.Builder(this)
            .setTitle("🚀 নতুন আপডেট উপলব্ধ (v$versionName)")
            .setMessage(notes)
            .setPositiveButton("এখনই আপডেট করুন") { _, _ ->
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl))
                startActivity(intent)
                if (forceUpdate) {
                    finish()
                }
            }

        if (!forceUpdate) {
            builder.setNegativeButton("পরে") { dialog, _ -> dialog.dismiss() }
        } else {
            builder.setCancelable(false)
        }

        builder.show()
    }

    /**
     * JavaScript Bridge Interface with Strict Origin Enforcement (Invariant #11)
     */
    inner class GoComWebAppInterface(private val context: Context) {
        @JavascriptInterface
        fun isNativeApp(): Boolean {
            return isCallerOriginAllowed()
        }

        @JavascriptInterface
        fun getAppVersionCode(): Int {
            return if (isCallerOriginAllowed()) CURRENT_VERSION_CODE else -1
        }

        private fun isCallerOriginAllowed(): Boolean {
            val currentUrl = webView.url ?: return false
            val host = Uri.parse(currentUrl).host?.lowercase() ?: return false
            return ALLOWED_ORIGINS.any { allowed -> host == allowed || host.endsWith(".$allowed") }
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
