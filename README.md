# SwiftBeam

SwiftBeam is a cross-platform file sharing application that leverages Wi-Fi Aware technology to enable direct device-to-device file transfers without requiring an internet connection. It provides a seamless AirDrop-like experience across iOS, Android, Windows, and macOS devices.

![SwiftBeam Logo](public/file.svg)

## Features

- **Cross-Platform File Sharing**: Share files directly between iOS, Android, Windows, and macOS devices
- **No Internet Required**: Uses Wi-Fi Aware technology for direct device-to-device communication
- **Fast Transfers**: High-speed file transfers using direct Wi-Fi connections
- **User-Friendly Interface**: Simple, intuitive design for sending and receiving files
- **Device Discovery**: Automatic discovery of nearby compatible devices
- **Transfer History**: Keep track of sent and received files
- **Security**: Secure file transfers with end-to-end encryption
- **Custom Device Name**: Personalize how your device appears to others

## Technology Stack

- **Frontend**: Next.js 15.4.3 with React 19.1
- **Mobile**: Capacitor for native iOS and Android support
- **Styling**: Tailwind CSS with shadcn UI components
- **State Management**: React Context API
- **File Handling**: Native file system APIs with Capacitor
- **Device Discovery**: Wi-Fi Aware plugin (@asaf/wifi-aware)

## How It Works

SwiftBeam uses the Wi-Fi Aware protocol to enable direct device-to-device communication. Here's how the process works:

1. **Device Broadcasting**: When you enable file sharing, your device broadcasts its presence to nearby devices.
2. **Device Discovery**: SwiftBeam automatically discovers other nearby devices that have the app running.
3. **File Selection**: Select one or more files you want to share and the recipient device(s).
4. **Transfer Request**: The recipient receives a notification with details about the incoming file(s).
5. **Acceptance/Rejection**: The recipient can accept or decline the file transfer request.
6. **Transfer**: Files are transferred directly between devices using Wi-Fi Aware connections.
7. **Completion**: Both sender and receiver are notified when transfers are complete.

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Xcode 15+ (for iOS development)
- Android Studio (for Android development)
- A device with Wi-Fi Aware capabilities

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AsafMeizner/swiftbeam.git
   cd swiftbeam
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up the environment:
   ```bash
   npm run setup
   # or
   yarn setup
   ```

### Running the Application

#### Web Development (Next.js)

```bash
npm run dev
# or
yarn dev
```

#### iOS

```bash
npm run build
npx cap sync ios
npx cap open ios
```

#### Android

```bash
npm run build
npx cap sync android
npx cap open android
```

## Usage Guide

### Settings

1. **Enable File Sharing**: Go to the Settings page and toggle "Enable File Sharing" on.
2. **Set Device Name**: Customize how your device appears to others.
3. **Visibility Settings**: Choose between "Everyone", "Contacts Only", or "Hidden".
4. **Configure Auto-Accept**: Optionally enable automatic acceptance of files from trusted devices.
5. **Set File Size Limits**: Configure maximum file size limitations.

### Sending Files

1. Navigate to the "Share" page.
2. Drag and drop files or click to select files.
3. Wait for nearby devices to be discovered.
4. Select the recipient device(s).
5. Click "Send Files".
6. Wait for the recipient to accept the transfer.
7. Monitor the transfer progress until completion.

### Receiving Files

1. Ensure file sharing is enabled in Settings.
2. When someone sends you files, a notification will appear.
3. Review the file details and choose to accept or decline.
4. If accepted, select a save location (optional).
5. Monitor the transfer progress until completion.
6. Access the received files from your chosen save location or the "History" page.

### Transfer History

The "History" page displays a record of all your sent and received files. You can:
- Filter by sent or received files
- Sort by date, size, or file type
- Resend files to recent devices
- Delete transfer records

## Developer Guide

### Project Structure

```
swiftbeam/
├── android/            # Android platform-specific code
├── ios/                # iOS platform-specific code
├── public/             # Static assets
├── src/
│   ├── app/            # Next.js app router pages
│   │   ├── dev/        # Developer debugging tools 
│   │   ├── discovery/  # Device discovery page
│   │   ├── history/    # Transfer history page
│   │   ├── settings/   # App settings page
│   │   └── share/      # File sharing page
│   ├── components/     # React components
│   ├── contexts/       # React context providers
│   ├── entities/       # Data models
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Core utilities
│   ├── services/       # Business logic services
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Helper utilities
├── capacitor.config.ts # Capacitor configuration
└── next.config.js      # Next.js configuration
```

### Key Services

- **WiFiAwareCore**: Wrapper around the native Wi-Fi Aware plugin
- **WiFiAwareBroadcastService**: Manages broadcasting and file transfer requests
- **DeviceDiscoveryService**: Handles device discovery and management
- **FileTransferService**: Manages file transfers between devices

### Developer Tools

SwiftBeam includes a dedicated developer tools page accessible from the navigation sidebar. This page provides:

- **Live Log Viewer**: Real-time monitoring of all WiFi Aware events and API calls
- **Method Testing**: Directly invoke WiFi Aware API methods with custom parameters
- **Raw Event Viewer**: Inspect the raw event data received from the plugin
- **Broadcast Payload Inspector**: View the exact data being broadcast by the plugin

To access the developer tools:

1. Navigate to the "Dev Tools" page in the sidebar
2. Use the tabs to switch between different debugging views
3. Monitor events in real-time as you interact with the app

For troubleshooting installation issues, such as npm script execution errors, you may need to adjust PowerShell execution policy:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Wi-Fi Aware Plugin API

The `@asaf/wifi-aware` plugin provides the following key APIs:

- **Device Discovery**: `publish()`, `subscribe()`, `stopAll()`
- **File Transfer**: `sendFile()`, `cancelFileTransfer()`
- **Device Info**: `getDeviceInfo()`
- **Socket Connections**: `createSocket()`, `connectToSocket()`
- **Events**: `serviceFound`, `serviceLost`, `fileTransferRequest`, `fileTransferProgress`, `fileTransferCompleted`

For detailed API documentation, refer to the `WiFi-Aware-Guide.md` file.

## Contributing

We welcome contributions to SwiftBeam! Please follow these steps to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

Please ensure your code follows the existing code style and includes appropriate tests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [@asaf/wifi-aware](https://github.com/AsafMeizner/wifi-aware-plugin) - The native Wi-Fi Aware plugin
- [Capacitor](https://capacitorjs.com/) - Native runtime for cross-platform apps
- [Next.js](https://nextjs.org/) - React framework
- [shadcn/ui](https://ui.shadcn.com/) - UI component system

## Contact

Asaf Meizner - [@AsafMeizner](https://github.com/AsafMeizner)

Project Link: [https://github.com/AsafMeizner/swiftbeam](https://github.com/AsafMeizner/swiftbeam)