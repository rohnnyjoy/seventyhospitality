import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AppIcon,
  Button,
  Callout,
  Card,
  Checkbox,
  DataTable,
  type DataTableColumn,
  EmptyState,
  FileInput,
  Input,
  Modal,
  ModalActions,
  Tag,
  Text,
  TextArea,
  Toggle,
  TimezoneSelect,
  pageStyles,
} from 'octahedron';
import { api, ApiError } from '../lib/api';
import {
  formatDateTimeInputValue,
  formatEventDate,
  formatEventDuration,
  formatEventSchedule,
  parseDateTimeInputValue,
} from '../lib/format';
import {
  type ClubEvent,
  type CourtConflictDetails,
  type CourtOption,
  type EventUpsertPayload,
  isManagedEventImageUrl,
  isCourtConflictDetails,
  resolveEventImageUrl,
  serializeSelectedIds,
  toggleSelectedId,
} from '../lib/events';
import { FormField } from './FormField';
import styles from './EventSettings.module.css';

const DEFAULT_TIMEZONE = 'America/New_York';

const columns: DataTableColumn<ClubEvent>[] = [
  {
    name: 'Title',
    cell: (row) => row.title,
    sortValue: (row) => row.title,
  },
  {
    name: 'Schedule',
    cell: (row) => formatEventSchedule(row.startsAt, row.endsAt, row.timezone),
    sortValue: (row) => new Date(row.startsAt),
    wrapText: true,
  },
  {
    name: 'Courts',
    cell: (row) =>
      row.courts.length > 0 ? row.courts.map((court) => court.name).join(', ') : '—',
    tooltip: (row) =>
      row.courts.length > 0 ? row.courts.map((court) => court.name).join(', ') : undefined,
    wrapText: true,
    maxWidth: 220,
  },
  {
    name: 'Timezone',
    cell: (row) => row.timezone,
    maxWidth: 180,
    tooltip: (row) => row.timezone,
  },
  {
    name: 'Assets',
    cell: (row) =>
      row.imageUrl ? <Tag variant="info">Image</Tag> : row.details ? <Tag variant="neutral">Details</Tag> : '—',
    maxWidth: 100,
  },
  {
    name: 'Status',
    cell: (row) => (
      <Tag variant={row.active ? 'success' : 'neutral'}>{row.active ? 'Active' : 'Inactive'}</Tag>
    ),
    maxWidth: 100,
  },
];

interface EventFormSnapshot {
  title: string;
  imageUrl: string;
  details: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  active: boolean;
  selectedCourtIds: string;
}

function getDefaultDateTimeValue(hoursFromNow: number, timeZone: string): string {
  const nextTime = new Date();
  nextTime.setMinutes(0, 0, 0);
  nextTime.setHours(nextTime.getHours() + hoursFromNow);
  return formatDateTimeInputValue(nextTime, timeZone);
}

function createInitialFormSnapshot(event: ClubEvent | null): EventFormSnapshot {
  const timezone = event?.timezone ?? DEFAULT_TIMEZONE;

  return {
    title: event?.title ?? '',
    imageUrl: event?.imageUrl ?? '',
    details: event?.details ?? '',
    startsAt: event ? formatDateTimeInputValue(event.startsAt, timezone) : getDefaultDateTimeValue(1, timezone),
    endsAt: event ? formatDateTimeInputValue(event.endsAt, timezone) : getDefaultDateTimeValue(3, timezone),
    timezone,
    active: event?.active ?? true,
    selectedCourtIds: serializeSelectedIds(event?.courts.map((court) => court.id) ?? []),
  };
}

function getEventPreview(startsAt: string, endsAt: string, timeZone: string, courtCount: number) {
  try {
    const previewStart = parseDateTimeInputValue(startsAt, timeZone);
    const previewEnd = parseDateTimeInputValue(endsAt, timeZone);
    if (new Date(previewEnd).getTime() <= new Date(previewStart).getTime()) {
      return null;
    }

    return {
      summary: formatEventSchedule(previewStart, previewEnd, timeZone),
      date: formatEventDate(previewStart, timeZone),
      duration: formatEventDuration(previewStart, previewEnd),
      courtCount,
    };
  } catch {
    return null;
  }
}

export function EventSettings() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [courts, setCourts] = useState<CourtOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);

    Promise.all([
      api.listEvents({ includePast: true, includeInactive: true }),
      api.listAllCourts(),
    ])
      .then(([eventRows, courtRows]) => {
        setEvents(eventRows ?? []);
        setCourts(courtRows ?? []);
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Failed to load events');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const emptyState = useMemo(
    () => (
      <EmptyState
        title="No events yet"
        description="Create the first event to populate the club calendar."
        action={
          <Button color="primary" onClick={() => setCreating(true)}>
            New Event
          </Button>
        }
      />
    ),
    [],
  );

  return (
    <div className={styles.page}>
      <div className={pageStyles.headerRow}>
        <div className={pageStyles.headerLeft}>
          <div className={pageStyles.headerTitleStack}>
            <Text variant="title" as="div" className={pageStyles.headerTitle}>
              Events
            </Text>
            <Text variant="caption" intent="muted" truncate as="div">
              Create and edit club events with title, image, schedule, and details.
            </Text>
          </div>
        </div>
        <div className={pageStyles.headerActions}>
          <Button color="primary" icon={<AppIcon name="plus" />} onClick={() => setCreating(true)}>
            New Event
          </Button>
        </div>
      </div>

      {loadError ? (
        <div className={pageStyles.notice}>
          <Callout
            intent="danger"
            title="Could not load events"
            action={<Button onClick={load}>Retry</Button>}
          >
            {loadError}
          </Callout>
        </div>
      ) : null}

      <div className={styles.tableArea}>
        <DataTable
          rows={events}
          columns={columns}
          rowKey={(row) => row.id}
          onRowClick={(row) => setEditingEvent(row)}
          loading={loading}
          emptyMessage={emptyState}
          pagination={{
            defaultPageSize: 25,
            pageSizeOptions: [10, 25, 50, 100],
            showSizeChanger: true,
            showControls: true,
          }}
          ariaLabel="Events"
        />
      </div>

      {creating ? (
        <EventEditModal
          key="new-event"
          event={null}
          courts={courts}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      ) : null}

      {editingEvent ? (
        <EventEditModal
          key={editingEvent.id}
          event={editingEvent}
          courts={courts}
          onClose={() => setEditingEvent(null)}
          onSaved={() => {
            setEditingEvent(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}

function EventEditModal({
  event,
  courts,
  onClose,
  onSaved,
}: {
  event: ClubEvent | null;
  courts: CourtOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialState = useMemo(() => createInitialFormSnapshot(event), [event]);

  const [title, setTitle] = useState(initialState.title);
  const [imageUrl, setImageUrl] = useState(initialState.imageUrl);
  const [details, setDetails] = useState(initialState.details);
  const [startsAt, setStartsAt] = useState(initialState.startsAt);
  const [endsAt, setEndsAt] = useState(initialState.endsAt);
  const [timezone, setTimezone] = useState(initialState.timezone);
  const [active, setActive] = useState(initialState.active);
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>(event?.courts.map((court) => court.id) ?? []);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [conflictDetails, setConflictDetails] = useState<CourtConflictDetails | null>(null);
  const initialImageUrl = initialState.imageUrl.trim();

  const hasUnsavedChanges =
    title !== initialState.title ||
    imageUrl !== initialState.imageUrl ||
    details !== initialState.details ||
    startsAt !== initialState.startsAt ||
    endsAt !== initialState.endsAt ||
    timezone !== initialState.timezone ||
    active !== initialState.active ||
    serializeSelectedIds(selectedCourtIds) !== initialState.selectedCourtIds;

  useEffect(() => {
    setConflictDetails(null);
  }, [title, imageUrl, details, startsAt, endsAt, timezone, active, selectedCourtIds]);

  const preview = useMemo(
    () => getEventPreview(startsAt, endsAt, timezone, selectedCourtIds.length),
    [endsAt, selectedCourtIds.length, startsAt, timezone],
  );

  const trimmedImageUrl = imageUrl.trim();
  const previewImageUrl = useMemo(() => resolveEventImageUrl(trimmedImageUrl || null), [trimmedImageUrl]);

  const selectedCourts = useMemo(
    () => courts.filter((court) => selectedCourtIds.includes(court.id)),
    [courts, selectedCourtIds],
  );

  const inactiveSelectedCourts = selectedCourts.filter((court) => !court.active);

  function toggleCourt(courtId: string, checked: boolean) {
    setSelectedCourtIds((current) => toggleSelectedId(current, courtId, checked));
  }

  const discardDraftImage = useCallback(
    async (candidateImageUrl: string) => {
      const normalizedImageUrl = candidateImageUrl.trim();
      if (
        !normalizedImageUrl ||
        normalizedImageUrl === initialImageUrl ||
        !isManagedEventImageUrl(normalizedImageUrl)
      ) {
        return;
      }

      try {
        await api.deleteEventImage(normalizedImageUrl);
      } catch {
        // Best-effort cleanup for abandoned draft uploads.
      }
    },
    [initialImageUrl],
  );

  const handleClose = useCallback(async () => {
    if (saving || uploadingImage) {
      return;
    }

    await discardDraftImage(trimmedImageUrl);
    onClose();
  }, [discardDraftImage, onClose, saving, trimmedImageUrl, uploadingImage]);

  async function handleImageUpload(uploadEvent: FormEvent<HTMLInputElement>) {
    const input = uploadEvent.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setImageUploadError(null);
    setError(null);
    const previousImageUrl = trimmedImageUrl;

    try {
      const uploaded = await api.uploadEventImage(file);
      setImageUrl(uploaded.imageUrl);
      await discardDraftImage(previousImageUrl);
    } catch (uploadError: unknown) {
      setImageUploadError(uploadError instanceof Error ? uploadError.message : 'Failed to upload image');
    } finally {
      input.value = '';
      setUploadingImage(false);
    }
  }

  async function handleRemoveImage() {
    const previousImageUrl = trimmedImageUrl;
    setImageUrl('');
    setImageUploadError(null);
    await discardDraftImage(previousImageUrl);
  }

  async function handleSave(cancelConflictingBookings = false) {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (uploadingImage) {
      setError('Wait for the image upload to finish before saving');
      return;
    }
    if (!timezone) {
      setError('Timezone is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const parsedStartsAt = parseDateTimeInputValue(startsAt, timezone);
      const parsedEndsAt = parseDateTimeInputValue(endsAt, timezone);
      if (new Date(parsedEndsAt).getTime() <= new Date(parsedStartsAt).getTime()) {
        setError('End time must be after the start time');
        return;
      }

      const payload: EventUpsertPayload = {
        title: title.trim(),
        imageUrl: imageUrl.trim() || null,
        details: details.trim() || null,
        startsAt: parsedStartsAt,
        endsAt: parsedEndsAt,
        timezone,
        active,
        courtIds: selectedCourtIds,
        cancelConflictingBookings,
      };

      if (event) {
        await api.updateEvent(event.id, payload);
      } else {
        await api.createEvent(payload);
      }

      onSaved();
    } catch (saveError: unknown) {
      if (
        saveError instanceof ApiError &&
        saveError.code === 'COURT_CONFLICT' &&
        isCourtConflictDetails(saveError.details)
      ) {
        setConflictDetails(saveError.details);
        setError(null);
        return;
      }
      setError(saveError instanceof Error ? saveError.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={handleClose}
      title={event ? 'Edit Event' : 'New Event'}
      width={640}
      error={error}
      hasUnsavedChanges={hasUnsavedChanges}
      footer={
        <ModalActions>
          <Button onClick={handleClose} disabled={saving || uploadingImage}>Cancel</Button>
          {conflictDetails ? (
            <Button color="warning" onClick={() => handleSave(true)} loading={saving} disabled={uploadingImage}>
              Claim Courts and Cancel {conflictDetails.conflicts.length} Booking{conflictDetails.conflicts.length === 1 ? '' : 's'}
            </Button>
          ) : (
            <Button color="primary" onClick={() => handleSave(false)} loading={saving} disabled={uploadingImage}>
              {event ? 'Save' : 'Create'}
            </Button>
          )}
        </ModalActions>
      }
    >
      <div className={styles.modalBody}>
        <Card padding="md">
          <div className={styles.stack}>
            {previewImageUrl ? (
              <img src={previewImageUrl} alt="" className={styles.previewImage} />
            ) : null}
            <Text variant="label" as="div">Preview</Text>
            <Text as="div">{title.trim() || 'Untitled event'}</Text>
            <Text variant="caption" intent="muted">
              {preview ? preview.summary : 'Enter a valid schedule to preview this event.'}
            </Text>
            {preview?.courtCount ? (
              <Text variant="caption" intent="muted">
                Claiming {preview.courtCount} court{preview.courtCount === 1 ? '' : 's'} for the event window.
              </Text>
            ) : null}
            {trimmedImageUrl ? (
              <Tag variant="info" title={trimmedImageUrl}>Image attached</Tag>
            ) : null}
          </div>
        </Card>

        <FormField label="Title">
          {(id) => <Input id={id} fill value={title} onValueChange={setTitle} />}
        </FormField>

        <FormField
          label="Event image"
          helperText="Upload a JPG, PNG, WebP, or GIF image up to 5 MB."
        >
          {(id) => (
            <div className={styles.imageField}>
              <FileInput
                id={id}
                fill
                accept="image/jpeg,image/png,image/webp,image/gif"
                text={uploadingImage ? 'Uploading image...' : trimmedImageUrl ? 'Replace image' : 'Upload image'}
                hasSelection={Boolean(trimmedImageUrl)}
                disabled={saving || uploadingImage}
                onInputChange={handleImageUpload}
              />
              {trimmedImageUrl ? (
                <div className={styles.imageActions}>
                  <Tag variant="info">Image attached</Tag>
                  <Button variant="ghost" onClick={() => void handleRemoveImage()} disabled={saving || uploadingImage}>
                    Remove image
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </FormField>

        {imageUploadError ? (
          <Callout intent="danger" title="Image upload failed">
            {imageUploadError}
          </Callout>
        ) : null}

        <FormField label="Details">
          {(id) => (
            <TextArea
              id={id}
              rows={5}
              value={details}
              onValueChange={setDetails}
              placeholder="Add timing notes, guest info, dress code, ticket details, or anything members should know."
            />
          )}
        </FormField>

        <FormField label="Starts at">
          {(id) => (
            <Input
              id={id}
              fill
              type="datetime-local"
              value={startsAt}
              onValueChange={setStartsAt}
            />
          )}
        </FormField>

        <FormField label="Ends at">
          {(id) => (
            <Input
              id={id}
              fill
              type="datetime-local"
              value={endsAt}
              onValueChange={setEndsAt}
            />
          )}
        </FormField>

        <FormField label="Timezone">
          {(id) => (
            <TimezoneSelect
              id={id}
              fill
              value={timezone}
              onValueChange={(value) => setTimezone(value ?? DEFAULT_TIMEZONE)}
            />
          )}
        </FormField>

        <Card padding="md">
          <div className={styles.stack}>
            <Text variant="label" as="div">Claim courts</Text>
            <Text variant="caption" intent="muted">
              Claimed courts are removed from member availability while this event is active.
            </Text>
            {courts.length === 0 ? (
              <Text variant="caption" intent="muted">No courts configured yet.</Text>
            ) : (
              <div className={styles.checkboxList}>
                {courts.map((court) => (
                  <Checkbox
                    key={court.id}
                    checked={selectedCourtIds.includes(court.id)}
                    onValueChange={(checked) => toggleCourt(court.id, checked)}
                    label={
                      <span>
                        {court.name}
                        {!court.active ? ' (inactive)' : ''}
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </Card>

        <Toggle checked={active} onValueChange={setActive} label="Active" />

        {inactiveSelectedCourts.length > 0 ? (
          <Callout intent="warning" title="Inactive courts selected">
            {inactiveSelectedCourts.map((court) => court.name).join(', ')} {inactiveSelectedCourts.length === 1 ? 'is' : 'are'} currently inactive.
          </Callout>
        ) : null}

        {conflictDetails ? (
          <Callout intent="warning" title="Court claim conflicts found">
            <div className={styles.conflictList}>
              <Text variant="caption" as="div">
                Saving this event as-is would cancel the following bookings. Use the warning action to confirm that override.
              </Text>
              {conflictDetails.conflicts.map((conflict) => (
                <Card key={conflict.bookingId} padding="sm">
                  <div className={styles.stack}>
                    <Text variant="label" as="div">{conflict.courtName}</Text>
                    <Text variant="caption" intent="muted">
                      {conflict.date} · {conflict.startTime} - {conflict.endTime}
                    </Text>
                    <Text variant="caption" as="div">
                      {conflict.memberName} · {conflict.memberEmail}
                    </Text>
                  </div>
                </Card>
              ))}
            </div>
          </Callout>
        ) : null}

        {preview ? (
          <Callout intent="info" title={preview.date}>
            Duration: {preview.duration}. Displayed in {timezone}.
          </Callout>
        ) : (
          <Callout intent="warning" title="Schedule preview unavailable">
            Check the start time, end time, and timezone values.
          </Callout>
        )}
      </div>
    </Modal>
  );
}
