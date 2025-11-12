Build started...
Build succeeded.
IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetRoles] (
        [Id] nvarchar(450) NOT NULL,
        [Name] nvarchar(256) NULL,
        [NormalizedName] nvarchar(256) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUsers] (
        [Id] nvarchar(450) NOT NULL,
        [FullName] nvarchar(150) NOT NULL,
        [Gender] nvarchar(10) NOT NULL,
        [DOB] date NOT NULL,
        [LibraryID] int NULL,
        [Career] nvarchar(150) NULL,
        [UserName] nvarchar(256) NULL,
        [NormalizedUserName] nvarchar(256) NULL,
        [Email] nvarchar(256) NULL,
        [NormalizedEmail] nvarchar(256) NULL,
        [EmailConfirmed] bit NOT NULL,
        [PasswordHash] nvarchar(max) NULL,
        [SecurityStamp] nvarchar(max) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        [PhoneNumber] nvarchar(max) NULL,
        [PhoneNumberConfirmed] bit NOT NULL,
        [TwoFactorEnabled] bit NOT NULL,
        [LockoutEnd] datetimeoffset NULL,
        [LockoutEnabled] bit NOT NULL,
        [AccessFailedCount] int NOT NULL,
        CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [RegistrationInvitations] (
        [Token] nvarchar(450) NOT NULL,
        [Role] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [IsUsed] bit NOT NULL,
        [UsedAt] datetime2 NULL,
        [UsedByUserId] nvarchar(max) NULL,
        [CreatedByUserId] nvarchar(max) NULL,
        CONSTRAINT [PK_RegistrationInvitations] PRIMARY KEY ([Token])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetRoleClaims] (
        [Id] int NOT NULL IDENTITY,
        [RoleId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserClaims] (
        [Id] int NOT NULL IDENTITY,
        [UserId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserLogins] (
        [LoginProvider] nvarchar(450) NOT NULL,
        [ProviderKey] nvarchar(450) NOT NULL,
        [ProviderDisplayName] nvarchar(max) NULL,
        [UserId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
        CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserRoles] (
        [UserId] nvarchar(450) NOT NULL,
        [RoleId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [AspNetUserTokens] (
        [UserId] nvarchar(450) NOT NULL,
        [LoginProvider] nvarchar(450) NOT NULL,
        [Name] nvarchar(450) NOT NULL,
        [Value] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
        CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [Directors] (
        [Id] nvarchar(450) NOT NULL,
        [Department] nvarchar(max) NULL,
        CONSTRAINT [PK_Directors] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Directors_AspNetUsers_Id] FOREIGN KEY ([Id]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [Notifications] (
        [Id] int NOT NULL IDENTITY,
        [UserId] nvarchar(450) NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Message] nvarchar(1000) NOT NULL,
        [Type] nvarchar(50) NOT NULL,
        [IsRead] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [RelatedEntityId] int NULL,
        [RelatedEntityType] nvarchar(50) NULL,
        CONSTRAINT [PK_Notifications] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Notifications_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [Organizations] (
        [Id] nvarchar(450) NOT NULL,
        [Area] nvarchar(max) NULL,
        CONSTRAINT [PK_Organizations] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Organizations_AspNetUsers_Id] FOREIGN KEY ([Id]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [Students] (
        [Id] nvarchar(450) NOT NULL,
        [CV] nvarchar(max) NULL,
        CONSTRAINT [PK_Students] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Students_AspNetUsers_Id] FOREIGN KEY ([Id]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [Teachers] (
        [Id] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_Teachers] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Teachers_AspNetUsers_Id] FOREIGN KEY ([Id]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [AgreementRequests] (
        [Id] int NOT NULL IDENTITY,
        [OrganizationId] nvarchar(450) NOT NULL,
        [DirectorId] nvarchar(450) NOT NULL,
        [RequestDate] datetime2 NOT NULL,
        [ReviewDate] datetime2 NULL,
        [Status] nvarchar(max) NOT NULL,
        [Description] nvarchar(max) NOT NULL,
        [PdfFilePath] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_AgreementRequests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AgreementRequests_Directors_DirectorId] FOREIGN KEY ([DirectorId]) REFERENCES [Directors] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_AgreementRequests_Organizations_OrganizationId] FOREIGN KEY ([OrganizationId]) REFERENCES [Organizations] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [InternshipOffers] (
        [Id] int NOT NULL IDENTITY,
        [OrganizationId] nvarchar(450) NOT NULL,
        [Title] nvarchar(max) NOT NULL,
        [Description] nvarchar(max) NOT NULL,
        [Requirements] nvarchar(max) NOT NULL,
        [StartDate] datetime2 NOT NULL,
        [EndDate] datetime2 NOT NULL,
        [Mode] nvarchar(max) NOT NULL,
        [Career] nvarchar(max) NOT NULL,
        [ContactEmail] nvarchar(max) NULL,
        [ContactPhone] nvarchar(max) NULL,
        [Vacancies] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_InternshipOffers] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_InternshipOffers_Organizations_OrganizationId] FOREIGN KEY ([OrganizationId]) REFERENCES [Organizations] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE TABLE [InternshipApplications] (
        [Id] int NOT NULL IDENTITY,
        [InternshipOfferId] int NOT NULL,
        [StudentId] nvarchar(450) NOT NULL,
        [ApplicationDate] datetime2 NOT NULL,
        [Status] nvarchar(max) NOT NULL,
        [CoverLetter] nvarchar(max) NULL,
        [CVFilePath] nvarchar(max) NULL,
        [ReviewDate] datetime2 NULL,
        [ReviewNotes] nvarchar(max) NULL,
        [VirtualMeetingLink] nvarchar(max) NULL,
        [InterviewDateTime] datetime2 NULL,
        [InterviewMode] nvarchar(max) NULL,
        [InterviewLink] nvarchar(max) NULL,
        [InterviewAddress] nvarchar(max) NULL,
        [InterviewAttendanceConfirmed] bit NULL,
        CONSTRAINT [PK_InternshipApplications] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_InternshipApplications_InternshipOffers_InternshipOfferId] FOREIGN KEY ([InternshipOfferId]) REFERENCES [InternshipOffers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_InternshipApplications_Students_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [Students] ([Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AgreementRequests_DirectorId] ON [AgreementRequests] ([DirectorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AgreementRequests_OrganizationId] ON [AgreementRequests] ([OrganizationId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_InternshipApplications_InternshipOfferId] ON [InternshipApplications] ([InternshipOfferId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_InternshipApplications_StudentId] ON [InternshipApplications] ([StudentId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_InternshipOffers_OrganizationId] ON [InternshipOffers] ([OrganizationId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Notifications_UserId] ON [Notifications] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20251112205716_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20251112205716_InitialCreate', N'8.0.7');
END;
GO

COMMIT;
GO


