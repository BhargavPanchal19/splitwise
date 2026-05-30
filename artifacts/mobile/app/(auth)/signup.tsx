import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  // Multi-step signup state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Input states
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(59);

  // Countdown timer for Step 2
  useEffect(() => {
    let interval: any;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Step 1: Send verification code
  function handleSendCode() {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedCode(newCode);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setTimer(59);
      setStep(2);
      Alert.alert("Code Sent", "We've sent a simulated 4-digit verification code to " + email + ". Use code: " + newCode);
    }, 800);
  }

  // Step 2: Verify the 4-digit code
  function handleVerifyCode() {
    if (code.trim() !== generatedCode) {
      Alert.alert("Verification Failed", "Invalid code. Please enter the correct code: " + generatedCode);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 600);
  }

  function handlePhoneChange(text: string) {
    setPhone(text.replace(/\D/g, "").slice(0, 10));
  }

  // Step 3: Complete Sign Up
  async function handleSignup() {
    if (!name.trim() || !phone.trim() || !password) {
      Alert.alert("Error", "Please fill in all details.");
      return;
    }
    if (phone.length !== 10) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await signUp(name, phone, email, password);
      router.replace("/(tabs)/friends");
    } catch (e: any) {
      Alert.alert("Sign Up Failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back navigation button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step > 1) {
              setStep((prev) => (prev - 1) as any);
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>

        {/* Step 1: Email Verification request */}
        {step === 1 && (
          <View style={styles.formContainer}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>Verify Email</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Enter your email address to receive a secure verification code
              </Text>
            </View>

            <View style={styles.form}>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Email Address"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleSendCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Code</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 2: Verification Code Confirmation */}
        {step === 2 && (
          <View style={styles.formContainer}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>Enter Code</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                We sent a 4-digit code to <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{email}</Text>. Please enter it below.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Ionicons name="keypad-outline" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground, letterSpacing: 4 }]}
                  placeholder={"Enter Code (" + generatedCode + ")"}
                  placeholderTextColor={colors.mutedForeground}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              {timer > 0 ? (
                <Text style={[styles.timerText, { color: colors.mutedForeground }]}>
                  Resend code in 0:{timer < 10 ? `0${timer}` : timer}
                </Text>
              ) : (
                <TouchableOpacity onPress={handleSendCode}>
                  <Text style={[styles.resendText, { color: colors.primary }]}>Resend Code</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleVerifyCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Complete registration details (Name, Phone, Password) */}
        {step === 3 && (
          <View style={styles.formContainer}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>Complete Profile</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Provide your phone number, password, and name to secure your account.
              </Text>
            </View>

            {/* Verification Success Badge */}
            <View style={[styles.verifiedBadge, { backgroundColor: "rgba(28, 194, 159, 0.08)" }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={[styles.verifiedBadgeText, { color: colors.primary }]}>
                Email Verified: {email}
              </Text>
            </View>

            <View style={styles.form}>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Ionicons name="person-outline" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Full Name"
                  placeholderTextColor={colors.mutedForeground}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Ionicons name="call-outline" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Phone Number"
                  placeholderTextColor={colors.mutedForeground}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Create Password (min. 6 chars)"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.back()}
        >
          <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
            Already have an account?{" "}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
              Sign in
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 28,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  formContainer: {
    gap: 24,
  },
  header: {
    gap: 8,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  verifiedBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  form: {
    gap: 14,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    height: "100%",
  },
  eyeButton: {
    padding: 4,
  },
  timerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textAlign: "center",
    marginTop: 2,
  },
  resendText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textAlign: "center",
    marginTop: 2,
  },
  button: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: "#1CC29F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#fff",
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8,
    marginTop: "auto",
  },
  linkText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
});
