import { AppCategoriesService } from './app-categories.service';
import type { AppCategoriesRepository } from './app-categories.repository';
import type { AppsRepository } from './apps.repository';
import { BusinessException } from '../../common/exceptions/business.exception';

type CategoriesRepoMock = jest.Mocked<
  Pick<
    AppCategoriesRepository,
    | 'findAll'
    | 'findById'
    | 'findBySlug'
    | 'create'
    | 'updateById'
    | 'deleteById'
  >
>;

type AppsRepoMock = jest.Mocked<Pick<AppsRepository, 'pullCategoryFromAll'>>;

function makeService() {
  const categoriesRepo: CategoriesRepoMock = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
  };
  const appsRepo: AppsRepoMock = {
    pullCategoryFromAll: jest.fn(),
  };
  const service = new AppCategoriesService(
    categoriesRepo as unknown as AppCategoriesRepository,
    appsRepo as unknown as AppsRepository,
  );
  return { service, categoriesRepo, appsRepo };
}

describe('AppCategoriesService', () => {
  describe('create', () => {
    it('derives a slug from the name', async () => {
      const { service, categoriesRepo } = makeService();
      categoriesRepo.findBySlug.mockResolvedValue(null);
      categoriesRepo.create.mockResolvedValue({
        _id: { toString: () => 'c1' },
        name: 'Office & Meetings',
        slug: 'office-meetings',
        order: 0,
      } as never);

      await service.create({ name: 'Office & Meetings' });

      expect(categoriesRepo.create).toHaveBeenCalledWith({
        name: 'Office & Meetings',
        slug: 'office-meetings',
        order: 0,
      });
    });

    it('appends a suffix when the slug collides', async () => {
      const { service, categoriesRepo } = makeService();
      categoriesRepo.findBySlug
        .mockResolvedValueOnce({ _id: { toString: () => 'other' } } as never)
        .mockResolvedValueOnce(null);
      categoriesRepo.create.mockResolvedValue({
        _id: { toString: () => 'c2' },
        name: 'Media',
        slug: 'media-2',
        order: 0,
      } as never);

      await service.create({ name: 'Media' });

      expect(categoriesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'media-2' }),
      );
    });
  });

  describe('seedBaseCategories', () => {
    const BASE_SLUGS = [
      'information',
      'finance',
      'productivity',
      'data-dashboards',
      'media',
      'social',
      'utilities',
    ];

    it('creates all seven base categories when none exist', async () => {
      const { service, categoriesRepo } = makeService();
      categoriesRepo.findBySlug.mockResolvedValue(null);
      categoriesRepo.create.mockResolvedValue({} as never);

      await service.seedBaseCategories();

      expect(categoriesRepo.create).toHaveBeenCalledTimes(7);
      const createdSlugs = categoriesRepo.create.mock.calls.map(
        ([data]) => data.slug,
      );
      expect(createdSlugs).toEqual(BASE_SLUGS);
      // Orders are the declared 1..7 in list order.
      expect(categoriesRepo.create.mock.calls.map(([d]) => d.order)).toEqual([
        1, 2, 3, 4, 5, 6, 7,
      ]);
    });

    it('is idempotent — creates nothing when they all exist', async () => {
      const { service, categoriesRepo } = makeService();
      categoriesRepo.findBySlug.mockResolvedValue({ _id: {} } as never);

      await service.seedBaseCategories();

      expect(categoriesRepo.create).not.toHaveBeenCalled();
    });

    it('only creates the missing ones (leaves existing untouched)', async () => {
      const { service, categoriesRepo } = makeService();
      categoriesRepo.findBySlug.mockImplementation((slug: string) =>
        Promise.resolve(
          slug === 'finance' ? ({ _id: {} } as never) : null,
        ),
      );
      categoriesRepo.create.mockResolvedValue({} as never);

      await service.seedBaseCategories();

      expect(categoriesRepo.create).toHaveBeenCalledTimes(6);
      const createdSlugs = categoriesRepo.create.mock.calls.map(
        ([data]) => data.slug,
      );
      expect(createdSlugs).not.toContain('finance');
    });

    it('tolerates a concurrent-boot duplicate-key error', async () => {
      const { service, categoriesRepo } = makeService();
      categoriesRepo.findBySlug.mockResolvedValue(null);
      categoriesRepo.create.mockRejectedValue({ code: 11000 });

      await expect(service.seedBaseCategories()).resolves.toBeUndefined();
    });

    it('rethrows a non-duplicate error', async () => {
      const { service, categoriesRepo } = makeService();
      categoriesRepo.findBySlug.mockResolvedValue(null);
      categoriesRepo.create.mockRejectedValue(new Error('db down'));

      await expect(service.seedBaseCategories()).rejects.toThrow('db down');
    });
  });

  describe('remove', () => {
    it('pulls the category reference from every app after deleting', async () => {
      const { service, categoriesRepo, appsRepo } = makeService();
      categoriesRepo.deleteById.mockResolvedValue(true);

      await service.remove('cat-id');

      expect(categoriesRepo.deleteById).toHaveBeenCalledWith('cat-id');
      expect(appsRepo.pullCategoryFromAll).toHaveBeenCalledWith('cat-id');
    });

    it('throws and does not touch apps when the category is missing', async () => {
      const { service, categoriesRepo, appsRepo } = makeService();
      categoriesRepo.deleteById.mockResolvedValue(false);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        BusinessException,
      );
      expect(appsRepo.pullCategoryFromAll).not.toHaveBeenCalled();
    });
  });
});
