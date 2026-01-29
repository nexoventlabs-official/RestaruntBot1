import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Switch, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const DAYS = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' }
];

// Convert 24-hour time to 12-hour format with AM/PM
const formatTime12Hour = (time24) => {
  if (!time24) return '12:00 AM';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Convert 12-hour time to 24-hour format
const convertTo24Hour = (hours12, period) => {
  let hours = parseInt(hours12);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours.toString().padStart(2, '0');
};

// Time Picker Component for individual day
const DayTimePicker = ({ day, daySchedule, onUpdate, defaultStartTime, defaultEndTime }) => {
  const startTime = daySchedule?.startTime || defaultStartTime || '09:00';
  const endTime = daySchedule?.endTime || defaultEndTime || '22:00';
  const enabled = daySchedule?.enabled !== false;

  const updateDayTime = (field, time) => {
    onUpdate(day.value, { 
      day: day.value,
      enabled: true,
      startTime: field === 'startTime' ? time : startTime,
      endTime: field === 'endTime' ? time : endTime
    });
  };

  const toggleDayEnabled = () => {
    onUpdate(day.value, { 
      day: day.value,
      enabled: !enabled,
      startTime: startTime,
      endTime: endTime
    });
  };

  const incrementHour = (field) => {
    const time = field === 'startTime' ? startTime : endTime;
    const [hours, minutes] = time.split(':').map(Number);
    let newHours = (hours + 1) % 24;
    updateDayTime(field, `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
  };

  const decrementHour = (field) => {
    const time = field === 'startTime' ? startTime : endTime;
    const [hours, minutes] = time.split(':').map(Number);
    let newHours = hours - 1;
    if (newHours < 0) newHours = 23;
    updateDayTime(field, `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
  };

  const incrementMinute = (field) => {
    const time = field === 'startTime' ? startTime : endTime;
    const [hours, minutes] = time.split(':').map(Number);
    let newMinutes = (minutes + 5) % 60;
    updateDayTime(field, `${hours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`);
  };

  const decrementMinute = (field) => {
    const time = field === 'startTime' ? startTime : endTime;
    const [hours, minutes] = time.split(':').map(Number);
    let newMinutes = minutes - 5;
    if (newMinutes < 0) newMinutes = 55;
    updateDayTime(field, `${hours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`);
  };

  const togglePeriod = (field) => {
    const time = field === 'startTime' ? startTime : endTime;
    const [hours, minutes] = time.split(':').map(Number);
    let newHours = hours >= 12 ? hours - 12 : hours + 12;
    updateDayTime(field, `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
  };

  const renderTimePicker = (field, label) => {
    const time = field === 'startTime' ? startTime : endTime;
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;

    return (
      <View style={styles.miniTimeRow}>
        <Text style={styles.miniTimeLabel}>{label}</Text>
        <View style={styles.miniTimePickersContainer}>
          <View style={styles.miniTimePickerBox}>
            <TouchableOpacity onPress={() => incrementHour(field)} disabled={!enabled}>
              <Ionicons name="chevron-up" size={16} color={enabled ? "#E23744" : "#d1d5db"} />
            </TouchableOpacity>
            <Text style={[styles.miniTimeDigit, !enabled && styles.textDisabled]}>{hours12}</Text>
            <TouchableOpacity onPress={() => decrementHour(field)} disabled={!enabled}>
              <Ionicons name="chevron-down" size={16} color={enabled ? "#E23744" : "#d1d5db"} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.miniTimeSeparator, !enabled && styles.textDisabled]}>:</Text>
          <View style={styles.miniTimePickerBox}>
            <TouchableOpacity onPress={() => incrementMinute(field)} disabled={!enabled}>
              <Ionicons name="chevron-up" size={16} color={enabled ? "#E23744" : "#d1d5db"} />
            </TouchableOpacity>
            <Text style={[styles.miniTimeDigit, !enabled && styles.textDisabled]}>
              {minutes.toString().padStart(2, '0')}
            </Text>
            <TouchableOpacity onPress={() => decrementMinute(field)} disabled={!enabled}>
              <Ionicons name="chevron-down" size={16} color={enabled ? "#E23744" : "#d1d5db"} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={[styles.miniPeriodToggle, !enabled && styles.miniPeriodToggleDisabled]}
            onPress={() => togglePeriod(field)}
            disabled={!enabled}
          >
            <Text style={[styles.miniPeriodText, !enabled && styles.textDisabled]}>{period}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.dayCard, !enabled && styles.dayCardDisabled]}>
      <View style={styles.dayCardHeader}>
        <TouchableOpacity 
          style={[styles.dayToggle, enabled && styles.dayToggleActive]}
          onPress={toggleDayEnabled}
        >
          <Ionicons 
            name={enabled ? "checkmark-circle" : "ellipse-outline"} 
            size={24} 
            color={enabled ? "#22c55e" : "#d1d5db"} 
          />
          <Text style={[styles.dayToggleText, enabled && styles.dayToggleTextActive]}>
            {day.fullLabel}
          </Text>
        </TouchableOpacity>
        {enabled && (
          <Text style={styles.dayTimePreview}>
            {formatTime12Hour(startTime)} - {formatTime12Hour(endTime)}
          </Text>
        )}
      </View>
      {enabled && (
        <View style={styles.dayCardBody}>
          {renderTimePicker('startTime', 'From')}
          {renderTimePicker('endTime', 'To')}
        </View>
      )}
    </View>
  );
};

export default function CategoryScheduleModal({
  visible,
  category,
  scheduleForm,
  setScheduleForm,
  onSave,
  onClose,
  saving
}) {
  // Initialize customDays if not present
  useEffect(() => {
    if (scheduleForm.type === 'custom' && (!scheduleForm.customDays || scheduleForm.customDays.length === 0)) {
      // Initialize with default times for backward compatibility
      const defaultCustomDays = scheduleForm.days?.map(day => ({
        day,
        enabled: true,
        startTime: scheduleForm.startTime || '09:00',
        endTime: scheduleForm.endTime || '22:00'
      })) || [];
      setScheduleForm(prev => ({ ...prev, customDays: defaultCustomDays }));
    }
  }, [scheduleForm.type]);

  const updateDaySchedule = (dayValue, daySchedule) => {
    setScheduleForm(prev => {
      const existingIndex = prev.customDays?.findIndex(d => d.day === dayValue) ?? -1;
      let newCustomDays;
      
      if (existingIndex >= 0) {
        newCustomDays = [...(prev.customDays || [])];
        newCustomDays[existingIndex] = daySchedule;
      } else {
        newCustomDays = [...(prev.customDays || []), daySchedule];
      }
      
      // Also update days array for backward compatibility
      const enabledDays = newCustomDays.filter(d => d.enabled).map(d => d.day).sort();
      
      return { 
        ...prev, 
        customDays: newCustomDays,
        days: enabledDays
      };
    });
  };

  const getDaySchedule = (dayValue) => {
    return scheduleForm.customDays?.find(d => d.day === dayValue) || {
      day: dayValue,
      enabled: false,
      startTime: scheduleForm.startTime || '09:00',
      endTime: scheduleForm.endTime || '22:00'
    };
  };

  const updateTime = (field, hours, minutes, period) => {
    const hours24 = convertTo24Hour(hours, period);
    const timeString = `${hours24}:${minutes}`;
    setScheduleForm(prev => ({ ...prev, [field]: timeString }));
  };

  const incrementHour = (field) => {
    const [hours, minutes] = scheduleForm[field].split(':').map(Number);
    let newHours24 = (hours + 1) % 24;
    const newPeriod = newHours24 >= 12 ? 'PM' : 'AM';
    const newHours12 = newHours24 % 12 || 12;
    updateTime(field, newHours12, minutes.toString().padStart(2, '0'), newPeriod);
  };

  const decrementHour = (field) => {
    const [hours, minutes] = scheduleForm[field].split(':').map(Number);
    let newHours24 = hours - 1;
    if (newHours24 < 0) newHours24 = 23;
    const newPeriod = newHours24 >= 12 ? 'PM' : 'AM';
    const newHours12 = newHours24 % 12 || 12;
    updateTime(field, newHours12, minutes.toString().padStart(2, '0'), newPeriod);
  };

  const incrementMinute = (field) => {
    const [hours, minutes] = scheduleForm[field].split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    let newMinutes = (minutes + 5) % 60;
    updateTime(field, hours12, newMinutes.toString().padStart(2, '0'), period);
  };

  const decrementMinute = (field) => {
    const [hours, minutes] = scheduleForm[field].split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    let newMinutes = minutes - 5;
    if (newMinutes < 0) newMinutes = 55;
    updateTime(field, hours12, newMinutes.toString().padStart(2, '0'), period);
  };

  const togglePeriod = (field) => {
    const [hours, minutes] = scheduleForm[field].split(':').map(Number);
    const currentPeriod = hours >= 12 ? 'PM' : 'AM';
    const newPeriod = currentPeriod === 'AM' ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    updateTime(field, hours12, minutes.toString().padStart(2, '0'), newPeriod);
  };

  const validateAndSave = () => {
    if (scheduleForm.type === 'custom') {
      // Validate custom days - at least one day must be enabled
      const enabledDays = scheduleForm.customDays?.filter(d => d.enabled) || [];
      if (enabledDays.length === 0) {
        Alert.alert('Validation Error', 'Please enable at least one day for custom schedule');
        return;
      }
      
      // Validate each enabled day has valid times
      for (const daySchedule of enabledDays) {
        const [startHour, startMin] = daySchedule.startTime.split(':').map(Number);
        const [endHour, endMin] = daySchedule.endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const dayName = DAYS.find(d => d.value === daySchedule.day)?.fullLabel;
        
        if (startMinutes === endMinutes) {
          Alert.alert('Invalid Time Range', `Start and end time cannot be the same for ${dayName}`);
          return;
        }
        
        // Check if end time is before start time (and not an overnight schedule)
        // Allow overnight only if there's at least 1 hour difference
        if (endMinutes < startMinutes && (startMinutes - endMinutes) < 60) {
          Alert.alert(
            'Invalid Time Range', 
            `End time (${formatTime12Hour(daySchedule.endTime)}) cannot be before start time (${formatTime12Hour(daySchedule.startTime)}) for ${dayName}.\n\nIf you want an overnight schedule, make sure there's at least 1 hour gap.`
          );
          return;
        }
        
        // For same-day schedules (end > start), ensure at least 15 min difference
        if (endMinutes > startMinutes && (endMinutes - startMinutes) < 15) {
          Alert.alert(
            'Invalid Time Range', 
            `Schedule must be at least 15 minutes long for ${dayName}`
          );
          return;
        }
      }
    } else {
      // Validate daily schedule
      const [startHour, startMin] = scheduleForm.startTime.split(':').map(Number);
      const [endHour, endMin] = scheduleForm.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (startMinutes === endMinutes) {
        Alert.alert('Invalid Time Range', 'Start time and end time cannot be the same.');
        return;
      }
      
      // Check if end time is before start time (and not an overnight schedule)
      if (endMinutes < startMinutes && (startMinutes - endMinutes) < 60) {
        Alert.alert(
          'Invalid Time Range', 
          `End time (${formatTime12Hour(scheduleForm.endTime)}) cannot be before start time (${formatTime12Hour(scheduleForm.startTime)}).\n\nIf you want an overnight schedule, make sure there's at least 1 hour gap.`
        );
        return;
      }
      
      // For same-day schedules, ensure at least 15 min difference
      if (endMinutes > startMinutes && (endMinutes - startMinutes) < 15) {
        Alert.alert('Invalid Time Range', 'Schedule must be at least 15 minutes long.');
        return;
      }
    }

    onSave();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Schedule: {category?.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Enable Schedule */}
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Enable Schedule</Text>
                  <Text style={styles.switchSubtext}>Auto-lock category outside schedule</Text>
                </View>
                <Switch
                  value={scheduleForm.enabled}
                  onValueChange={(value) => setScheduleForm(prev => ({ ...prev, enabled: value }))}
                  trackColor={{ false: '#d1d5db', true: '#86efac' }}
                  thumbColor={scheduleForm.enabled ? '#22c55e' : '#f3f4f6'}
                />
              </View>
            </View>

            {scheduleForm.enabled && (
              <>
                {/* Schedule Type */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Schedule Type</Text>
                  <View style={styles.typeButtons}>
                    <TouchableOpacity
                      style={[styles.typeButton, scheduleForm.type === 'daily' && styles.typeButtonActive]}
                      onPress={() => setScheduleForm(prev => ({ ...prev, type: 'daily' }))}
                    >
                      <Ionicons 
                        name="calendar" 
                        size={20} 
                        color={scheduleForm.type === 'daily' ? '#fff' : '#6b7280'} 
                      />
                      <Text style={[styles.typeButtonText, scheduleForm.type === 'daily' && styles.typeButtonTextActive]}>
                        Every Day
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeButton, scheduleForm.type === 'custom' && styles.typeButtonActive]}
                      onPress={() => setScheduleForm(prev => ({ ...prev, type: 'custom' }))}
                    >
                      <Ionicons 
                        name="calendar-outline" 
                        size={20} 
                        color={scheduleForm.type === 'custom' ? '#fff' : '#6b7280'} 
                      />
                      <Text style={[styles.typeButtonText, scheduleForm.type === 'custom' && styles.typeButtonTextActive]}>
                        Custom Days
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Daily Time Selection */}
                {scheduleForm.type === 'daily' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Available Hours (Every Day)</Text>
                    
                    {/* Start Time */}
                    <View style={styles.timeRow}>
                      <Text style={styles.timeLabel}>From</Text>
                      <View style={styles.timePickersContainer}>
                        <View style={styles.timePickerBox}>
                          <TouchableOpacity style={styles.timeArrowButton} onPress={() => incrementHour('startTime')}>
                            <Ionicons name="chevron-up" size={20} color="#E23744" />
                          </TouchableOpacity>
                          <Text style={styles.timeDigit}>
                            {scheduleForm.startTime.split(':')[0] % 12 || 12}
                          </Text>
                          <TouchableOpacity style={styles.timeArrowButton} onPress={() => decrementHour('startTime')}>
                            <Ionicons name="chevron-down" size={20} color="#E23744" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.timeSeparator}>:</Text>
                        <View style={styles.timePickerBox}>
                          <TouchableOpacity style={styles.timeArrowButton} onPress={() => incrementMinute('startTime')}>
                            <Ionicons name="chevron-up" size={20} color="#E23744" />
                          </TouchableOpacity>
                          <Text style={styles.timeDigit}>
                            {scheduleForm.startTime.split(':')[1].padStart(2, '0')}
                          </Text>
                          <TouchableOpacity style={styles.timeArrowButton} onPress={() => decrementMinute('startTime')}>
                            <Ionicons name="chevron-down" size={20} color="#E23744" />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.periodToggle} onPress={() => togglePeriod('startTime')}>
                          <Text style={styles.periodText}>
                            {parseInt(scheduleForm.startTime.split(':')[0]) >= 12 ? 'PM' : 'AM'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* End Time */}
                    <View style={styles.timeRow}>
                      <Text style={styles.timeLabel}>To</Text>
                      <View style={styles.timePickersContainer}>
                        <View style={styles.timePickerBox}>
                          <TouchableOpacity style={styles.timeArrowButton} onPress={() => incrementHour('endTime')}>
                            <Ionicons name="chevron-up" size={20} color="#E23744" />
                          </TouchableOpacity>
                          <Text style={styles.timeDigit}>
                            {scheduleForm.endTime.split(':')[0] % 12 || 12}
                          </Text>
                          <TouchableOpacity style={styles.timeArrowButton} onPress={() => decrementHour('endTime')}>
                            <Ionicons name="chevron-down" size={20} color="#E23744" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.timeSeparator}>:</Text>
                        <View style={styles.timePickerBox}>
                          <TouchableOpacity style={styles.timeArrowButton} onPress={() => incrementMinute('endTime')}>
                            <Ionicons name="chevron-up" size={20} color="#E23744" />
                          </TouchableOpacity>
                          <Text style={styles.timeDigit}>
                            {scheduleForm.endTime.split(':')[1].padStart(2, '0')}
                          </Text>
                          <TouchableOpacity style={styles.timeArrowButton} onPress={() => decrementMinute('endTime')}>
                            <Ionicons name="chevron-down" size={20} color="#E23744" />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.periodToggle} onPress={() => togglePeriod('endTime')}>
                          <Text style={styles.periodText}>
                            {parseInt(scheduleForm.endTime.split(':')[0]) >= 12 ? 'PM' : 'AM'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.timeHint}>
                      Category will be available from {formatTime12Hour(scheduleForm.startTime)} to {formatTime12Hour(scheduleForm.endTime)} every day
                    </Text>
                  </View>
                )}

                {/* Custom Days Selection with Individual Times */}
                {scheduleForm.type === 'custom' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Set Schedule for Each Day</Text>
                    <Text style={styles.sectionSubtitle}>
                      Enable days and set different times for each
                    </Text>
                    
                    {DAYS.map(day => (
                      <DayTimePicker
                        key={day.value}
                        day={day}
                        daySchedule={getDaySchedule(day.value)}
                        onUpdate={updateDaySchedule}
                        defaultStartTime={scheduleForm.startTime}
                        defaultEndTime={scheduleForm.endTime}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={validateAndSave}
              disabled={saving}
            >
              <LinearGradient
                colors={['#E23744', '#CB1A27']}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save Schedule'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  switchSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    borderColor: '#E23744',
    backgroundColor: '#E23744',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  
  // Daily Time Selection
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    width: 60,
  },
  timePickersContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePickerBox: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 70,
  },
  timeArrowButton: {
    padding: 4,
  },
  timeDigit: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginVertical: 4,
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: '700',
    color: '#9ca3af',
    marginHorizontal: 4,
  },
  periodToggle: {
    backgroundColor: '#E23744',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  timeHint: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 18,
  },

  // Custom Day Cards
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    overflow: 'hidden',
  },
  dayCardDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#f3f4f6',
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  dayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayToggleActive: {},
  dayToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  dayToggleTextActive: {
    color: '#111827',
  },
  dayTimePreview: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  dayCardBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },

  // Mini Time Pickers for each day
  miniTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniTimeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    width: 45,
  },
  miniTimePickersContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniTimePickerBox: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 45,
  },
  miniTimeDigit: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  miniTimeSeparator: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9ca3af',
  },
  miniPeriodToggle: {
    backgroundColor: '#E23744',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  miniPeriodToggleDisabled: {
    backgroundColor: '#e5e7eb',
  },
  miniPeriodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  textDisabled: {
    color: '#d1d5db',
  },

  // Footer
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
