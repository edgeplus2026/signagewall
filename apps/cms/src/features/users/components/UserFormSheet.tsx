import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { UserRolePicker } from "@/features/users/components/UserRolePicker"
import { useInviteUser, useUpdateUser } from "@/features/users/hooks/useUsers"
import {
  createInviteUserSchema,
  createUpdateUserSchema,
  type InviteUserSchema,
  type UpdateUserSchema,
} from "@/features/users/schemas/userSchemas"
import type { User, UserRole } from "@/features/users/types/user.types"

const INVITE_FORM_ID = "invite-user-form"
const UPDATE_FORM_ID = "update-user-form"

type UserFormMode = "invite" | "edit"

interface UserFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: UserFormMode
  user?: User | null
}

export function UserFormSheet({
  open,
  onOpenChange,
  mode,
  user,
}: UserFormSheetProps) {
  const { t } = useTranslation()
  const inviteUser = useInviteUser()
  const updateUser = useUpdateUser()

  if (mode === "invite") {
    return (
      <InviteUserSheet
        open={open}
        onOpenChange={onOpenChange}
        inviteUser={inviteUser}
        t={t}
      />
    )
  }

  return (
    <UpdateUserSheet
      open={open}
      onOpenChange={onOpenChange}
      user={user}
      updateUser={updateUser}
      t={t}
    />
  )
}

interface InviteUserSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inviteUser: ReturnType<typeof useInviteUser>
  t: ReturnType<typeof useTranslation>["t"]
}

function InviteUserSheet({
  open,
  onOpenChange,
  inviteUser,
  t,
}: InviteUserSheetProps) {
  const inviteSchema = useMemo(() => createInviteUserSchema(t), [t])

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserSchema>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", email: "", role: "member" },
  })

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const onSubmit = handleSubmit(async (data) => {
    try {
      await inviteUser.mutateAsync(data)
      toast.success(t("users.invite.success"))
      reset()
      onOpenChange(false)
    } catch {
      toast.error(t("users.invite.error"))
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>{t("users.invite.title")}</SheetTitle>
          <SheetDescription>{t("users.invite.description")}</SheetDescription>
        </SheetHeader>
        <form
          id={INVITE_FORM_ID}
          className="flex flex-1 flex-col overflow-y-auto px-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="user-name">{t("common.name")}</FieldLabel>
              <Input id="user-name" autoComplete="name" {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="user-email">{t("common.email")}</FieldLabel>
              <Input
                id="user-email"
                type="email"
                autoComplete="email"
                {...register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field data-invalid={!!errors.role}>
              <FieldLabel>{t("users.columns.role")}</FieldLabel>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <UserRolePicker
                    id="user-role"
                    value={field.value}
                    onValueChange={field.onChange}
                    aria-invalid={!!errors.role}
                  />
                )}
              />
              <FieldError errors={[errors.role]} />
            </Field>
          </FieldGroup>
        </form>
        <SheetFooter className="flex-row justify-end gap-2 border-t border-secondary">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("users.form.cancel")}
          </Button>
          <Button
            type="submit"
            form={INVITE_FORM_ID}
            disabled={isSubmitting || inviteUser.isPending}
          >
            {t("users.invite.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

interface UpdateUserSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null | undefined
  updateUser: ReturnType<typeof useUpdateUser>
  t: ReturnType<typeof useTranslation>["t"]
}

function UpdateUserSheet({
  open,
  onOpenChange,
  user,
  updateUser,
  t,
}: UpdateUserSheetProps) {
  const updateSchema = useMemo(() => createUpdateUserSchema(t), [t])

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserSchema>({
    resolver: zodResolver(updateSchema),
    defaultValues: { name: "", role: "member" as UserRole },
  })

  useEffect(() => {
    if (open && user) {
      reset({ name: user.name, role: user.role })
    }
    if (!open) reset()
  }, [open, user, reset])

  const onSubmit = handleSubmit(async (data) => {
    if (!user) return

    try {
      await updateUser.mutateAsync({ id: user.id, payload: data })
      toast.success(t("users.update.success"))
      reset()
      onOpenChange(false)
    } catch {
      toast.error(t("users.update.error"))
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>{t("users.update.title")}</SheetTitle>
          <SheetDescription>{t("users.update.description")}</SheetDescription>
        </SheetHeader>
        <form
          id={UPDATE_FORM_ID}
          className="flex flex-1 flex-col overflow-y-auto px-4"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="edit-user-name">{t("common.name")}</FieldLabel>
              <Input id="edit-user-name" autoComplete="name" {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-user-email">{t("common.email")}</FieldLabel>
              <Input
                id="edit-user-email"
                type="email"
                value={user?.email ?? ""}
                disabled
                className="opacity-60"
              />
            </Field>
            <Field data-invalid={!!errors.role}>
              <FieldLabel>{t("users.columns.role")}</FieldLabel>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <UserRolePicker
                    id="edit-user-role"
                    value={field.value}
                    onValueChange={field.onChange}
                    aria-invalid={!!errors.role}
                  />
                )}
              />
              <FieldError errors={[errors.role]} />
            </Field>
          </FieldGroup>
        </form>
        <SheetFooter className="flex-row justify-end gap-2 border-t border-secondary">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("users.form.cancel")}
          </Button>
          <Button
            type="submit"
            form={UPDATE_FORM_ID}
            disabled={isSubmitting || updateUser.isPending}
          >
            {t("users.update.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
