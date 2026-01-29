import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
  Platform, StatusBar, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '../../theme';

const DELIVERY_GREEN = '#267E3E';

const HelpItem = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.helpItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.helpIcon}>
      <Ionicons name={icon} size={22} color={DELIVERY_GREEN} />
    </View>
    <View style={styles.helpContent}>
      <Text style={styles.helpTitle}>{title}</Text>
      {subtitle && <Text style={styles.helpSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.light.text.tertiary} />
  </TouchableOpacity>
);

const FAQItem = ({ question, answer }) => {
  const [expanded, setExpanded] = React.useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <TouchableOpacity style={styles.faqItem} onPress={toggleExpand} activeOpacity={0.7}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="chevron-down" size={20} color={colors.light.text.tertiary} />
        </Animated.View>
      </View>
      {expanded && <Text style={styles.faqAnswer}>{answer}</Text>}
    </TouchableOpacity>
  );
};

export default function DeliveryHelpSupportScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const handleCall = () => {
    Linking.openURL('tel:+919876543210');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@delivery.com?subject=Delivery Partner Support');
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/919876543210');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.light.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Contact Options */}
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.card}>
            <HelpItem
              icon="call-outline"
              title="Call Support"
              subtitle="Available 24/7"
              onPress={handleCall}
            />
            <View style={styles.divider} />
            <HelpItem
              icon="mail-outline"
              title="Email Support"
              subtitle="support@delivery.com"
              onPress={handleEmail}
            />
            <View style={styles.divider} />
            <HelpItem
              icon="logo-whatsapp"
              title="WhatsApp"
              subtitle="Quick response"
              onPress={handleWhatsApp}
            />
          </View>

          {/* FAQs */}
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.card}>
            <FAQItem
              question="How do I update my delivery status?"
              answer="On the order detail screen, tap the 'Update Status' button to change the order status. You can mark orders as 'Out for Delivery' or 'Delivered'."
            />
            <View style={styles.divider} />
            <FAQItem
              question="What if customer is not available?"
              answer="Try calling the customer using the call button. If unreachable, wait for 10 minutes and contact support for further assistance."
            />
            <View style={styles.divider} />
            <FAQItem
              question="How are my earnings calculated?"
              answer="Earnings are calculated based on distance traveled, order value, and any applicable incentives. You can view detailed breakdown in your earnings section."
            />
            <View style={styles.divider} />
            <FAQItem
              question="When do I receive my payout?"
              answer="Payouts are processed weekly every Monday. COD collections are settled within 24-48 hours after delivery confirmation."
            />
          </View>

          {/* Emergency */}
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyIcon}>
              <Ionicons name="warning" size={24} color="#EF4444" />
            </View>
            <View style={styles.emergencyContent}>
              <Text style={styles.emergencyTitle}>Emergency?</Text>
              <Text style={styles.emergencyText}>For urgent issues during delivery, call our emergency helpline</Text>
            </View>
            <TouchableOpacity style={styles.emergencyButton} onPress={handleCall}>
              <Ionicons name="call" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 56,
    paddingBottom: 16,
    paddingHorizontal: spacing.screenHorizontal,
    backgroundColor: colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.light.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.text.primary,
  },
  headerRight: { width: 40 },
  content: { padding: spacing.screenHorizontal },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.text.secondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.xl,
    ...shadows.card,
    overflow: 'hidden',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
  },
  helpIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.text.primary,
  },
  helpSubtitle: {
    fontSize: 13,
    color: colors.light.text.tertiary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.borderLight,
    marginLeft: 72,
  },
  faqItem: {
    padding: spacing.base,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.text.primary,
    marginRight: spacing.sm,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.light.text.secondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: radius.xl,
    padding: spacing.base,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  emergencyText: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 2,
  },
  emergencyButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacing: { height: 40 },
});
