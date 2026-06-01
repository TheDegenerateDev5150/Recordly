import { describe, expect, it } from "vitest";

import {
	getAvailableMicrophoneDevices,
	isLikelyDisplayAudioInputLabel,
} from "./useMicrophoneDevices";

describe("isLikelyDisplayAudioInputLabel", () => {
	it("filters Sidecar and display-audio routes", () => {
		expect(isLikelyDisplayAudioInputLabel("Sidecar Display Audio")).toBe(true);
		expect(isLikelyDisplayAudioInputLabel("LG HDR 4K Display Audio")).toBe(true);
		expect(isLikelyDisplayAudioInputLabel("AirPlay Receiver Audio")).toBe(true);
	});

	it("keeps real microphones even when the label mentions a display", () => {
		expect(isLikelyDisplayAudioInputLabel("Studio Display Microphone")).toBe(false);
		expect(isLikelyDisplayAudioInputLabel("MacBook Pro Microphone")).toBe(false);
		expect(isLikelyDisplayAudioInputLabel("AirPods Max Microphone")).toBe(false);
	});
});

describe("getAvailableMicrophoneDevices", () => {
	it("excludes likely display-audio endpoints from the microphone list", () => {
		const devices = getAvailableMicrophoneDevices([
			{
				deviceId: "default",
				groupId: "builtin-group",
				kind: "audioinput",
				label: "MacBook Pro Microphone",
			},
			{
				deviceId: "sidecar",
				groupId: "sidecar-group",
				kind: "audioinput",
				label: "Sidecar Display Audio",
			},
			{
				deviceId: "studio-display",
				groupId: "display-group",
				kind: "audioinput",
				label: "Studio Display Microphone",
			},
		] satisfies MediaDeviceInfo[]);

		expect(devices).toEqual([
			{
				deviceId: "default",
				groupId: "builtin-group",
				label: "MacBook Pro Microphone",
			},
			{
				deviceId: "studio-display",
				groupId: "display-group",
				label: "Studio Display Microphone",
			},
		]);
	});
});