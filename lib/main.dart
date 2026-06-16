import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set system navigation and status bar styles for absolute gaming immersion
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Color(0xFF0F0E13), // Ryvex obsidian color match
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF0F0E13),
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  
  runApp(const RyvexApp());
}

class RyvexApp extends StatelessWidget {
  const RyvexApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ryvex Esports',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F0E13),
        primaryColor: const Color(0xFF06B6D4), // Ryvex Cyber Cyan
      ),
      home: const RyvexWebViewScreen(),
    );
  }
}

class RyvexWebViewScreen extends StatefulWidget {
  const RyvexWebViewScreen({super.key});

  @override
  State<RyvexWebViewScreen> createState() => _RyvexWebViewScreenState();
}

class _RyvexWebViewScreenState extends State<RyvexWebViewScreen> {
  late final WebViewController _controller;
  int _loadingProgress = 0;
  bool _hasError = false;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _initializeWebViewController();
  }

  void _initializeWebViewController() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0F0E13))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            setState(() {
              _loadingProgress = progress;
            });
          },
          onPageStarted: (String url) {
            setState(() {
              _hasError = false;
            });
          },
          onPageFinished: (String url) {
            setState(() {
              _loadingProgress = 100;
            });
          },
          onWebResourceError: (WebResourceError error) {
            // Ignore minor layout or benign websocket messages
            if (error.description.contains('websocket') || error.description.contains('ws://')) {
              return;
            }
            setState(() {
              _hasError = true;
              _errorMessage = error.description;
            });
          },
          onNavigationRequest: (NavigationRequest request) async {
            final url = request.url;
            // Open external custom applications (discord, external pages, mail keys) out of WebView
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              if (await canLaunchUrl(Uri.parse(url))) {
                await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                return NavigationDecision.prevent;
              }
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      // Connect to your beautiful responsive high-contrast deployment URL
      ..loadRequest(Uri.parse('https://ais-pre-govz3lymi2yffbisjghiqj-108592318181.asia-southeast1.run.app'));
  }

  Future<bool> _onWillPop() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false; // Prevent application closure, navigating browser history
    }
    return true; // Authorize system back exiting the application
  }

  @override
  Widget build(BuildContext context) {
    // Scaffold system with Back key intercepting behavior
    return WillPopScope(
      onWillPop: _onWillPop,
      child: Scaffold(
        body: SafeArea(
          child: Stack(
            children: [
              // Dedicated interactive platform WebView
              WebViewWidget(controller: _controller),

              // Neon Cyan loading spinner gate overlay
              if (_loadingProgress < 100)
                Container(
                  color: const Color(0xFF0F0E13),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 55,
                          height: 55,
                          child: CircularProgressIndicator(
                            value: _loadingProgress / 100.0,
                            strokeWidth: 4,
                            backgroundColor: const Color(0xFF1B1B22),
                            color: const Color(0xFF06B6D4), // Cyan active spectrum
                          ),
                        ),
                        const SizedBox(height: 28),
                        const Text(
                          "SYNCHRONIZING RYVEX ENGINES",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2.5,
                            fontFamily: 'monospace',
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "$_loadingProgress%",
                          style: const TextStyle(
                            color: Color(0xFF06B6D4),
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              // Clean responsive offline fallback
              if (_hasError)
                Container(
                  color: const Color(0xFF0F0E13),
                  padding: const EdgeInsets.symmetric(horizontal: 32.0),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.grid_goldenratio,
                          size: 64,
                          color: Color(0xFF06B6D4),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          "CONNECTION UNREGISTERED",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.5,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          "Unable to interface with Ryvex match servers. Please confirm you are online and refresh.",
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.grey[500],
                            fontSize: 11,
                            height: 1.5,
                          ),
                        ),
                        if (_errorMessage.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Text(
                            "Trigger: $_errorMessage",
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Color(0xFFEF4444),
                              fontSize: 9,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                        const SizedBox(height: 32),
                        ElevatedButton.icon(
                          onPressed: () {
                            setState(() {
                              _hasError = false;
                              _loadingProgress = 0;
                            });
                            _controller.reload();
                          },
                          icon: const Icon(Icons.refresh, color: Color(0xFF0F0E13), size: 18),
                          label: const Text(
                            "RETRY CONNECTION",
                            style: TextStyle(
                              color: Color(0xFF0F0E13),
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.0,
                              fontSize: 11,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF06B6D4),
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
