import { useEffect, useState } from "react";

export interface MicrophoneDevice {
	deviceId: string;
	label: string;
	groupId: string;
}

type AudioInputDeviceLike = Pick<MediaDeviceInfo, "deviceId" | "groupId" | "kind" | "label">;

const DISPLAY_AUDIO_ROUTE_TOKENS = ["display", "monitor", "screen", "hdmi", "airplay"];
const AUDIO_OUTPUT_TOKENS = ["audio", "speaker", "output"];
const MICROPHONE_TOKENS = ["mic", "microphone", "headset", "airpods", "airpods max"];

export function isLikelyDisplayAudioInputLabel(label: string): boolean {
	const normalizedLabel = label.trim().toLowerCase();
	if (!normalizedLabel) {
		return false;
	}

	const mentionsMicrophone = MICROPHONE_TOKENS.some((token) => normalizedLabel.includes(token));
	if (normalizedLabel.includes("sidecar")) {
		return !mentionsMicrophone;
	}

	if (normalizedLabel.includes("continuity") && !mentionsMicrophone) {
		return true;
	}

	const mentionsDisplayRoute = DISPLAY_AUDIO_ROUTE_TOKENS.some((token) =>
		normalizedLabel.includes(token),
	);
	const mentionsAudioOutput = AUDIO_OUTPUT_TOKENS.some((token) =>
		normalizedLabel.includes(token),
	);

	return mentionsDisplayRoute && mentionsAudioOutput && !mentionsMicrophone;
}

export function getAvailableMicrophoneDevices(devices: AudioInputDeviceLike[]): MicrophoneDevice[] {
	return devices
		.filter((device) => device.kind === "audioinput")
		.filter((device) => !isLikelyDisplayAudioInputLabel(device.label))
		.map((device) => ({
			deviceId: device.deviceId,
			label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
			groupId: device.groupId,
		}));
}

let hasRequestedMicrophoneLabels = false;

export function useMicrophoneDevices(enabled: boolean = true, preferredDeviceId?: string) {
	const [devices, setDevices] = useState<MicrophoneDevice[]>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string>("default");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		let mounted = true;

		const loadDevices = async () => {
			let permissionStream: MediaStream | null = null;

			try {
				setIsLoading(true);
				setError(null);

				let allDevices = await navigator.mediaDevices.enumerateDevices();
				let audioInputs = getAvailableMicrophoneDevices(allDevices);
				const rawAudioInputs = allDevices.filter(
					(device): device is MediaDeviceInfo => device.kind === "audioinput",
				);

				const needsLabelPermission =
					rawAudioInputs.length > 0 &&
					rawAudioInputs.every((device) => !device.label.trim());

				if (needsLabelPermission && !hasRequestedMicrophoneLabels) {
					hasRequestedMicrophoneLabels = true;
					permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
					allDevices = await navigator.mediaDevices.enumerateDevices();
					audioInputs = getAvailableMicrophoneDevices(allDevices);
				}

				if (mounted) {
					setDevices(audioInputs);
					setSelectedDeviceId((currentDeviceId) => {
						const normalizedPreferredDeviceId = preferredDeviceId ?? "default";
						if (
							audioInputs.some(
								(device) => device.deviceId === normalizedPreferredDeviceId,
							)
						) {
							return normalizedPreferredDeviceId;
						}

						if (
							currentDeviceId !== "default" &&
							audioInputs.some((device) => device.deviceId === currentDeviceId)
						) {
							return currentDeviceId;
						}

						return (
							audioInputs.find((device) => device.deviceId !== "default")?.deviceId ??
							audioInputs[0]?.deviceId ??
							"default"
						);
					});
					setIsLoading(false);
				}
			} catch (error) {
				if (mounted) {
					const message =
						error instanceof Error
							? error.message
							: "Failed to enumerate audio devices";
					setError(message);
					setIsLoading(false);
					console.error("Error loading microphone devices:", error);
				}
			} finally {
				permissionStream?.getTracks().forEach((track) => track.stop());
			}
		};

		void loadDevices();

		const handleDeviceChange = () => {
			void loadDevices();
		};

		navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

		return () => {
			mounted = false;
			navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
		};
	}, [enabled, preferredDeviceId]);

	return {
		devices,
		selectedDeviceId,
		setSelectedDeviceId,
		isLoading,
		error,
	};
}
