package bd.gocom.merchant

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import androidx.appcompat.app.AlertDialog

object BatteryOptimizationHelper {

    private const val PREFS_NAME = "gocom_battery_prefs"
    private const val KEY_PROMPTED = "battery_guide_prompted"

    fun showAutostartGuideIfNeeded(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (prefs.getBoolean(KEY_PROMPTED, false)) {
            return
        }

        // Check if battery optimization is already disabled on Android 6+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (pm != null && pm.isIgnoringBatteryOptimizations(context.packageName)) {
                return
            }
        }

        val manufacturer = Build.MANUFACTURER.lowercase()

        AlertDialog.Builder(context)
            .setTitle("🔔 তাৎক্ষণিক অর্ডার নোটিফিকেশন চালু করুন")
            .setMessage(
                "নতুন অর্ডার আসার সাথে সাথে উচ্চ-শব্দে ক্যাশ রেজিস্টার (Cha-Ching!) এলার্ট পেতে ব্যাকগ্রাউন্ড অটো-স্টার্ট ও ব্যাটারি অপ্টিমাইজেশন নিষ্ক্রিয় করুন।"
            )
            .setPositiveButton("সেটিংস চালু করুন") { _, _ ->
                prefs.edit().putBoolean(KEY_PROMPTED, true).apply()
                openBatterySettings(context, manufacturer)
            }
            .setNegativeButton("পরে করব") { dialog, _ ->
                prefs.edit().putBoolean(KEY_PROMPTED, true).apply()
                dialog.dismiss()
            }
            .setCancelable(false)
            .show()
    }

    private fun openBatterySettings(context: Context, manufacturer: String) {
        val intents = mutableListOf<Intent>()

        when {
            manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") -> {
                intents.add(
                    Intent().setComponent(
                        ComponentName(
                            "com.miui.securitycenter",
                            "com.miui.permcenter.autostart.AutoStartManagementActivity"
                        )
                    )
                )
            }
            manufacturer.contains("vivo") || manufacturer.contains("iqoo") -> {
                intents.add(
                    Intent().setComponent(
                        ComponentName(
                            "com.iqoo.secure",
                            "com.iqoo.secure.safeguard.PurviewTabActivity"
                        )
                    )
                )
                intents.add(
                    Intent().setComponent(
                        ComponentName(
                            "com.vivo.permissionmanager",
                            "com.vivo.permissionmanager.activity.PurviewTabActivity"
                        )
                    )
                )
            }
            manufacturer.contains("oppo") || manufacturer.contains("realme") -> {
                intents.add(
                    Intent().setComponent(
                        ComponentName(
                            "com.coloros.safecenter",
                            "com.coloros.safecenter.permission.startup.StartupAppListActivity"
                        )
                    )
                )
                intents.add(
                    Intent().setComponent(
                        ComponentName(
                            "com.oppo.safe",
                            "com.oppo.safe.permission.startup.StartupAppListActivity"
                        )
                    )
                )
            }
            manufacturer.contains("huawei") || manufacturer.contains("honor") -> {
                intents.add(
                    Intent().setComponent(
                        ComponentName(
                            "com.huawei.systemmanager",
                            "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
                        )
                    )
                )
            }
            manufacturer.contains("samsung") -> {
                intents.add(
                    Intent().setComponent(
                        ComponentName(
                            "com.samsung.android.lool",
                            "com.samsung.android.sm.ui.battery.BatteryActivity"
                        )
                    )
                )
            }
        }

        // Generic battery optimization intent as fallback
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            intents.add(
                Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${context.packageName}")
                }
            )
        }

        // General application settings fallback
        intents.add(
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
            }
        )

        for (intent in intents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                return
            } catch (e: Exception) {
                Log.w("BatteryOpt", "Could not start intent: ${intent.component}, error: ${e.message}")
            }
        }
    }
}
