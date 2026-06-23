package com.example.remotecontrol

import android.content.Context
import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject

class RemoteCommandClient(private val context: Context) {
    private val client = OkHttpClient()
    private var socket: WebSocket? = null

    fun connect(serverUrl: String, roomId: String, onStatus: (String) -> Unit) {
        socket?.cancel()
        val request = Request.Builder().url(serverUrl).build()
        socket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                webSocket.send(JSONObject().apply {
                    put("type", "join")
                    put("role", "android")
                    put("roomId", roomId)
                }.toString())
                onStatus("Android 已加入房间 $roomId")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                handleMessage(text)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e("RemoteCommandClient", "WebSocket failed", t)
                onStatus("连接失败：${t.message}")
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                onStatus("连接已关闭")
            }
        })
    }

    private fun handleMessage(text: String) {
        val message = JSONObject(text)
        val service = RemoteControlBridge.service ?: return
        val metrics = context.resources.displayMetrics
        val width = metrics.widthPixels.toFloat()
        val height = metrics.heightPixels.toFloat()

        when (message.optString("type")) {
            "tap" -> service.tap(
                (message.optDouble("x") * width).toFloat(),
                (message.optDouble("y") * height).toFloat()
            )

            "swipe" -> service.swipe(
                (message.optDouble("fromX") * width).toFloat(),
                (message.optDouble("fromY") * height).toFloat(),
                (message.optDouble("toX") * width).toFloat(),
                (message.optDouble("toY") * height).toFloat(),
                message.optLong("durationMs", 250)
            )

            "key" -> service.globalKey(message.optString("key"))
            "text" -> service.setFocusedText(message.optString("text"))
        }
    }
}
