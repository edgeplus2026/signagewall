import { BusinessException } from '../../common/exceptions/business.exception';
import { PlayerEvents } from '../player/player.events';
import { AvailabilityEvaluator } from './availability/availability.evaluator';
import { UpdateScreenAvailabilityDto } from './dto/update-screen-availability.dto';
import { ScreensService } from './screens.service';
import { ScreenAvailabilityMode, WeekdayKey } from './schemas/screen.schema';

const ALL_DAYS: WeekdayKey[] = [
  WeekdayKey.MONDAY,
  WeekdayKey.TUESDAY,
  WeekdayKey.WEDNESDAY,
  WeekdayKey.THURSDAY,
  WeekdayKey.FRIDAY,
  WeekdayKey.SATURDAY,
  WeekdayKey.SUNDAY,
];

function availabilityDto(
  overrides: Partial<UpdateScreenAvailabilityDto> = {},
): UpdateScreenAvailabilityDto {
  return {
    mode: ScreenAvailabilityMode.WEEKLY,
    timezone: 'Europe/Belgrade',
    weekly: ALL_DAYS.map((day) => ({
      day,
      enabled: day === WeekdayKey.MONDAY,
      start: '09:00',
      end: '17:00',
    })),
    special: {
      startDate: '2026-06-10',
      endDate: '2026-06-12',
      start: '09:00',
      end: '17:00',
    },
    ...overrides,
  };
}

function buildService(options: { updateResult?: unknown } = {}) {
  const screensRepository = {
    updateById: jest
      .fn()
      .mockResolvedValue(
        options.updateResult === undefined
          ? { _id: 'screen' }
          : options.updateResult,
      ),
  };
  const eventEmitter = { emit: jest.fn() };
  const i18n = { t: jest.fn((key: string) => key) };

  const service = new ScreensService(
    screensRepository as never,
    {} as never, // mediaRepository
    {} as never, // playlistsRepository
    {} as never, // appInstancesRepository
    {} as never, // configService
    i18n as never,
    new AvailabilityEvaluator(),
    eventEmitter as never,
  );

  return { service, screensRepository, eventEmitter };
}

describe('ScreensService.updateAvailability', () => {
  it('persists the availability and notifies the player layer exactly once', async () => {
    const { service, eventEmitter } = buildService();

    await service.updateAvailability('org', 'screen', availabilityDto());

    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      PlayerEvents.ScreenContentChanged,
      { organizationId: 'org', screenId: 'screen' },
    );
  });

  it('does not bump updatedAt (config change must not break the content lock)', async () => {
    const { service, screensRepository } = buildService();

    await service.updateAvailability('org', 'screen', availabilityDto());

    expect(screensRepository.updateById).toHaveBeenCalledWith(
      'org',
      'screen',
      expect.objectContaining({ availability: expect.anything() }),
      { touch: false },
    );
  });

  it('does not emit when validation rejects the config', async () => {
    const { service, screensRepository, eventEmitter } = buildService();
    const invalid = availabilityDto({
      special: {
        startDate: '2026-06-12',
        endDate: '2026-06-10', // reversed range
        start: '09:00',
        end: '17:00',
      },
    });

    await expect(
      service.updateAvailability('org', 'screen', invalid),
    ).rejects.toThrow(BusinessException);

    expect(screensRepository.updateById).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('does not emit when the screen is not found', async () => {
    const { service, eventEmitter } = buildService({ updateResult: null });

    await expect(
      service.updateAvailability('org', 'missing', availabilityDto()),
    ).rejects.toThrow(BusinessException);

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
