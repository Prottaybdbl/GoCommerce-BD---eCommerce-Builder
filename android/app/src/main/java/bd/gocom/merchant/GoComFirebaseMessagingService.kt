package bd.gocom.merchant

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.net.HttpURLConnection
import java.net.URL

class GoComFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        const val CHANNEL_ID = "new_orders_v1"
        private const val TAG = "GoComFCM"
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "Refreshed device token: $token")
        // Register token with backend in background thread
        registerTokenWithBackend(token)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val data = remoteMessage.data

        // PII-Free Payload Extraction (Invariant #7 & #11)
        val orderId = data["orderId"]
        val orderNumber = data["orderNumber"] ?: "নতুন"
        val totalAmount = data["totalAmountBdt"] ?: "0"
        val itemCount = data["itemCount"] ?: "1"

        val title = "💰 নতুন অর্ডার এসেছে! (#$orderNumber)"
        val message = "$itemCount টি আইটেম — মোট ৳$totalAmount"

        sendHighPriorityNotification(title, message, orderId)
    }

    private fun sendHighPriorityNotification(title: String, message: String, orderId: String?) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("orderId", orderId)
            if (orderId != null) {
                putExtra("target_url", "https://app.yourbrand.com/#/orders?highlight=$orderId")
            }
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        // Custom Cash Register Chime from res/raw/chaching.mp3 (Invariant #11)
        val soundUri = Uri.parse("android.resource://${packageName}/raw/chaching")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build()

            val channel = NotificationChannel(
                CHANNEL_ID,
                "নতুন অর্ডার এলার্ট (New Orders)",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "গ্রাহক নতুন অর্ডার দিলে তাৎক্ষণিক নোটিফিকেশন ও ক্যাশ রেজিস্টার আওয়াজ"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 100, 250)
                setSound(soundUri, audioAttributes)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val notificationBuilder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setSound(soundUri)
            .setContentIntent(pendingIntent)

        notificationManager.notify(System.currentTimeMillis().toInt(), notificationBuilder.build())
    }

    private fun registerTokenWithBackend(token: String) {
        Thread {
            try {
                val url = URL("https://app.yourbrand.com/api/admin/devices/register")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true

                val payload = """
                    {
                        "token": "$token",
                        "platform": "android",
                        "deviceName": "${Build.MANUFACTURER} ${Build.MODEL}"
                    }
                """.trimIndent()

                conn.outputStream.use { os ->
                    os.write(payload.toByteArray(Charsets.UTF_8))
                }

                val responseCode = conn.responseCode
                Log.d(TAG, "Device token registration response: $responseCode")
            } catch (e: Exception) {
                Log.w(TAG, "Background token registration skipped or offline: ${e.message}")
            }
        }.start()
    }
}
