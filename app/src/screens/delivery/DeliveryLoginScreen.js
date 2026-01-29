import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Animated,
  Dimensions, StatusBar, ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { colors, spacing, radius, typography, shadows } from '../../theme';

const { width } = Dimensions.get('window');
const DELIVERY_GREEN = '#267E3E';
const DELIVERY_DARK_GREEN = '#1B5E2E';

// Background image
const DELIVERY_LOGIN_BG = require('../../../assets/backgrounds/deliverylogin.jpg');

export default function DeliveryLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const { loginDelivery } = useAuth();

  const passwordRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Information', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await loginDelivery(email, password);
    } catch (error) {
      Alert.alert('Login Failed', error.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Premium Header with Background Image */}
      <ImageBackground
        source={DELIVERY_LOGIN_BG}
        style={styles.headerGradient}
        imageStyle={styles.headerBackgroundImage}
      >
        <View style={styles.headerOverlay}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
            <View style={styles.logoCircle}>
              <Ionicons name="bicycle" size={44} color={DELIVERY_GREEN} />
            </View>
            <Text style={styles.headerTitle}>Delivery Partner</Text>
            <Text style={styles.headerSubtitle}>Start earning with every delivery</Text>
          </Animated.View>

          {/* Stats Preview */}
          <View style={styles.statsPreview}>
            <View style={styles.statItem}>
              <Ionicons name="flash" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statText}>Fast Payouts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="location" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statText}>Flexible Hours</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="shield-checkmark" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statText}>Insured</Text>
            </View>
          </View>

          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
        </View>
      </ImageBackground>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <Animated.View style={[styles.formContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to start delivering</Text>
          </View>

          {/* Email/Phone Input */}
          <View style={[styles.inputContainer, focusedInput === 'email' && styles.inputContainerFocused]}>
            <View style={[styles.inputIconContainer, focusedInput === 'email' && styles.inputIconContainerFocused]}>
              <Ionicons name="person-outline" size={20} color={focusedInput === 'email' ? DELIVERY_GREEN : colors.light.text.tertiary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email or Phone Number"
              placeholderTextColor={colors.light.text.tertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Password Input */}
          <View style={[styles.inputContainer, focusedInput === 'password' && styles.inputContainerFocused]}>
            <View style={[styles.inputIconContainer, focusedInput === 'password' && styles.inputIconContainerFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color={focusedInput === 'password' ? DELIVERY_GREEN : colors.light.text.tertiary} />
            </View>
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
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.light.text.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={loading ? ['#9CA3AF', '#9CA3AF'] : [DELIVERY_GREEN, DELIVERY_DARK_GREEN]}
              style={styles.loginButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <Text style={styles.loginButtonText}>Signing in...</Text>
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Sign In</Text>
                  <View style={styles.loginButtonArrow}>
                    <Ionicons name="arrow-forward" size={18} color={DELIVERY_GREEN} />
                  </View>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Help Section */}
          <View style={styles.helpSection}>
            <View style={styles.helpIcon}>
              <Ionicons name="help-circle" size={18} color={DELIVERY_GREEN} />
            </View>
            <Text style={styles.helpText}>Need help? Contact support</Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  headerGradient: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerBackgroundImage: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
    paddingBottom: 40,
    paddingHorizontal: spacing.screenHorizontal,
  },
  backButton: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoSection: { alignItems: 'center' },
  logoCircle: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.base,
    ...shadows.xl,
  },
  headerTitle: { fontSize: typography.display.small.fontSize, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: typography.body.medium.fontSize, color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs },
  statsPreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: typography.label.small.fontSize, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  statDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: spacing.md },
  decorCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', top: -50, right: -50 },
  decorCircle2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: -30 },
  content: { flex: 1, padding: spacing.screenHorizontal, marginTop: -spacing.lg },
  formContainer: { backgroundColor: colors.light.surface, borderRadius: 24, padding: spacing.xl, ...shadows.lg },
  welcomeSection: { marginBottom: spacing.xl },
  welcomeTitle: { fontSize: typography.headline.large.fontSize, fontWeight: '700', color: colors.light.text.primary },
  welcomeSubtitle: { fontSize: typography.body.medium.fontSize, color: colors.light.text.secondary, marginTop: spacing.xs },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.light.surfaceSecondary,
    borderRadius: radius.lg, marginBottom: spacing.base,
    borderWidth: 2, borderColor: 'transparent',
  },
  inputContainerFocused: { borderColor: DELIVERY_GREEN, backgroundColor: colors.light.surface },
  inputIconContainer: { width: 52, height: 56, justifyContent: 'center', alignItems: 'center' },
  inputIconContainerFocused: { backgroundColor: '#E8F5E9', borderTopLeftRadius: radius.lg - 2, borderBottomLeftRadius: radius.lg - 2 },
  input: { flex: 1, fontSize: typography.body.large.fontSize, color: colors.light.text.primary, paddingVertical: spacing.base, paddingRight: spacing.base },
  loginButton: { borderRadius: radius.lg, overflow: 'hidden', ...shadows.md, marginTop: spacing.lg },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonGradient: { flexDirection: 'row', height: 56, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loginButtonText: { color: '#fff', fontSize: typography.title.large.fontSize, fontWeight: '600' },
  loginButtonArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  helpSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl, gap: spacing.sm },
  helpIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  helpText: { fontSize: typography.body.small.fontSize, color: colors.light.text.secondary },
});
