import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, 
  Alert, KeyboardAvoidingView, Platform, Pressable, StatusBar
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { colors, spacing, radius, typography, shadows } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function DeliveryLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { loginDelivery } = useAuth();
  
  const passwordRef = useRef(null);
  const logoScale = useSharedValue(1);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Missing Information', 'Please enter email and password');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await loginDelivery(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Login Failed', error.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const handleLogoPress = () => {
    logoScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, { damping: 10 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[colors.primary[50], colors.light.background]}
        style={StyleSheet.absoluteFill}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.content}
      >
        {/* Back Button */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Pressable 
            style={styles.backButton} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.light.text.primary} />
          </Pressable>
        </Animated.View>

        {/* Logo & Header */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.header}
        >
          <AnimatedPressable onPress={handleLogoPress}>
            <Animated.View style={[styles.iconContainer, logoAnimatedStyle]}>
              <LinearGradient
                colors={[colors.primary[400], colors.primary[600]]}
                style={styles.iconGradient}
              >
                <Ionicons name="bicycle" size={48} color="#fff" />
              </LinearGradient>
            </Animated.View>
          </AnimatedPressable>
          
          <Text style={styles.title}>Delivery Partner</Text>
          <Text style={styles.subtitle}>Login to start delivering</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View 
          entering={FadeInUp.delay(400).duration(600)}
          style={styles.form}
        >
          {/* Email Input */}
          <View style={[
            styles.inputContainer,
            emailFocused && styles.inputFocused
          ]}>
            <Ionicons 
              name="mail-outline" 
              size={20} 
              color={emailFocused ? colors.primary[400] : colors.light.text.tertiary} 
              style={styles.inputIcon} 
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.light.text.tertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          {/* Password Input */}
          <View style={[
            styles.inputContainer,
            passwordFocused && styles.inputFocused
          ]}>
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color={passwordFocused ? colors.primary[400] : colors.light.text.tertiary}
              style={styles.inputIcon} 
            />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.light.text.tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <Pressable 
              onPress={() => {
                Haptics.selectionAsync();
                setShowPassword(!showPassword);
              }}
              hitSlop={10}
            >
              <Ionicons 
                name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                size={20} 
                color={colors.light.text.tertiary} 
              />
            </Pressable>
          </View>

          {/* Login Button */}
          <Button
            title="Login"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.loginButton}
          />

          {/* Forgot Password */}
          <Pressable 
            style={styles.forgotPassword}
            onPress={() => Haptics.selectionAsync()}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.light.background 
  },
  content: { 
    flex: 1, 
    padding: spacing.screenHorizontal,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
  },
  backButton: { 
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  header: { 
    alignItems: 'center', 
    marginBottom: spacing['3xl'] 
  },
  iconContainer: {
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  iconGradient: {
    width: 100, 
    height: 100, 
    borderRadius: radius.xl,
    justifyContent: 'center', 
    alignItems: 'center',
  },
  title: { 
    fontSize: typography.display.medium.fontSize,
    fontWeight: typography.display.medium.fontWeight,
    lineHeight: typography.display.medium.lineHeight,
    color: colors.light.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: { 
    fontSize: typography.body.large.fontSize,
    lineHeight: typography.body.large.lineHeight,
    color: colors.light.text.secondary,
  },
  form: { 
    gap: spacing.base 
  },
  inputContainer: {
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: colors.light.surface, 
    borderRadius: radius.input, 
    paddingHorizontal: spacing.base, 
    height: 56,
    borderWidth: 1.5, 
    borderColor: colors.light.border,
    ...shadows.sm,
  },
  inputFocused: {
    borderColor: colors.primary[400],
    borderWidth: 2,
  },
  inputIcon: { 
    marginRight: spacing.md 
  },
  input: { 
    flex: 1, 
    fontSize: typography.body.large.fontSize,
    color: colors.light.text.primary,
  },
  loginButton: {
    marginTop: spacing.sm,
  },
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  forgotPasswordText: {
    fontSize: typography.label.large.fontSize,
    fontWeight: typography.label.large.fontWeight,
    color: colors.primary[400],
  },
});
