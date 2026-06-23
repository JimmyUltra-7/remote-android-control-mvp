package com.example.remotecontrol

import android.app.Activity
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private val projectionRequestCode = 1001
    private lateinit var commandClient: RemoteCommandClient

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        commandClient = RemoteCommandClient(applicationContext)

        val roomInput = EditText(this).apply {
            hint = "房间号"
            setText("123456")
        }
        val serverInput = EditText(this).apply {
            hint = "ws://你的电脑IP:3000"
            setText("ws://192.168.1.10:3000")
        }
        val accessibilityButton = Button(this).apply {
            text = "开启辅助功能权限"
            setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
        }
        val projectionButton = Button(this).apply {
            text = "授权屏幕共享"
            setOnClickListener { requestScreenCapture() }
        }
        val status = TextView(this).apply {
            text = "尚未连接"
        }
        val connectButton = Button(this).apply {
            text = "连接控制端"
            setOnClickListener {
                commandClient.connect(
                    serverInput.text.toString().trim(),
                    roomInput.text.toString().trim()
                ) { message -> runOnUiThread { status.text = message } }
            }
        }
        val note = TextView(this).apply {
            text = "当前已支持接收 tap/swipe/back/home/recents/text 指令。下一步接入 MediaProjection + WebRTC 屏幕画面。"
        }

        setContentView(
            LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(32, 48, 32, 32)
                addView(roomInput)
                addView(serverInput)
                addView(accessibilityButton)
                addView(projectionButton)
                addView(connectButton)
                addView(status)
                addView(note)
            }
        )
    }

    private fun requestScreenCapture() {
        val manager = getSystemService(MediaProjectionManager::class.java)
        startActivityForResult(manager.createScreenCaptureIntent(), projectionRequestCode)
    }
}
