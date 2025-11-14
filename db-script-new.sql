--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg120+1)
-- Dumped by pg_dump version 16.9 (Debian 16.9-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bets (
    id integer NOT NULL,
    user_id integer,
    game_id integer,
    transaction_id integer,
    bet_amount numeric(20,2) NOT NULL,
    win_amount numeric(20,2) DEFAULT 0,
    multiplier numeric(10,2),
    outcome character varying(20),
    game_data jsonb,
    placed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    result_at timestamp with time zone,
    session_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    CONSTRAINT bets_outcome_check CHECK (((outcome)::text = ANY ((ARRAY['win'::character varying, 'lose'::character varying, 'pending'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: bets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bets_id_seq OWNED BY public.bets.id;


--
-- Name: daily_user_bet_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.daily_user_bet_summary AS
 SELECT user_id,
    date(placed_at) AS bet_date,
    count(*) AS total_bets,
    sum(bet_amount) AS total_amount,
    sum(win_amount) AS total_win,
    (sum(win_amount) - sum(bet_amount)) AS net_profit,
    avg(bet_amount) AS avg_bet_amount
   FROM public.bets
  GROUP BY user_id, (date(placed_at));


--
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.games (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    provider character varying(100) NOT NULL,
    category character varying(50),
    subcategory character varying(50),
    image_url text,
    thumbnail_url text,
    game_code character varying(50),
    rtp_percentage numeric(5,2),
    volatility character varying(20),
    min_bet numeric(10,2),
    max_bet numeric(20,2),
    max_win numeric(20,2),
    is_featured boolean DEFAULT false,
    is_new boolean DEFAULT false,
    is_hot boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer DEFAULT 1,
    CONSTRAINT games_volatility_check CHECK (((volatility)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[])))
);


--
-- Name: games_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.games_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: games_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.games_id_seq OWNED BY public.games.id;


--
-- Name: kyc_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kyc_documents (
    id integer NOT NULL,
    user_id integer,
    document_type character varying(50) NOT NULL,
    document_number character varying(100),
    document_url text,
    front_image_url text,
    back_image_url text,
    selfie_image_url text,
    status character varying(20) DEFAULT 'pending'::character varying,
    rejection_reason text,
    verified_at timestamp with time zone,
    verified_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer DEFAULT 1,
    CONSTRAINT kyc_documents_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['passport'::character varying, 'national_id'::character varying, 'drivers_license'::character varying, 'utility_bill'::character varying, 'bank_statement'::character varying])::text[]))),
    CONSTRAINT kyc_documents_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: kyc_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kyc_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kyc_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kyc_documents_id_seq OWNED BY public.kyc_documents.id;


--
-- Name: promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    type character varying(50) NOT NULL,
    bonus_percentage numeric(5,2),
    max_bonus_amount numeric(20,2),
    min_deposit_amount numeric(20,2),
    wagering_requirement numeric(10,2),
    free_spins_count integer,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer DEFAULT 1,
    CONSTRAINT promotions_type_check CHECK (((type)::text = ANY ((ARRAY['welcome_bonus'::character varying, 'deposit_bonus'::character varying, 'free_spins'::character varying, 'cashback'::character varying, 'reload_bonus'::character varying, 'tournament'::character varying])::text[])))
);


--
-- Name: promotions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promotions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: promotions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promotions_id_seq OWNED BY public.promotions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer DEFAULT 1
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.statuses (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer DEFAULT 1
);


--
-- Name: statuses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.statuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: statuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.statuses_id_seq OWNED BY public.statuses.id;


--
-- Name: tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tokens (
    id integer NOT NULL,
    user_id integer,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expired_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer DEFAULT 1
);


--
-- Name: tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tokens_id_seq OWNED BY public.tokens.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    user_id integer,
    type character varying(20),
    amount numeric(20,2) NOT NULL,
    balance_before numeric(20,2),
    balance_after numeric(20,2),
    currency character varying(3) DEFAULT 'USD'::character varying,
    reference_id text,
    external_reference text,
    payment_method character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying,
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    CONSTRAINT transactions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT transactions_type_check CHECK (((type)::text = ANY ((ARRAY['deposit'::character varying, 'withdrawal'::character varying, 'bet'::character varying, 'win'::character varying, 'bonus'::character varying, 'cashback'::character varying, 'refund'::character varying, 'adjustment'::character varying])::text[])))
);


--
-- Name: transaction_summary_by_type; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.transaction_summary_by_type AS
 SELECT user_id,
    type,
    count(*) AS count,
    sum(amount) AS total_amount,
    avg(amount) AS avg_amount
   FROM public.transactions
  GROUP BY user_id, type;


--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: user_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_activity_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    category character varying(50),
    description text,
    ip_address inet,
    user_agent text,
    session_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1
);


--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_activity_logs_id_seq OWNED BY public.user_activity_logs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password text NOT NULL,
    auth_secret character varying(100),
    qr_code text,
    status_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer DEFAULT 1
);


--
-- Name: user_activity_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_activity_summary AS
 SELECT u.id AS user_id,
    u.username,
    count(ual.id) AS total_actions,
    count(DISTINCT date(ual.created_at)) AS active_days,
    max(ual.created_at) AS last_activity,
    count(DISTINCT ual.action) AS unique_actions,
    count(
        CASE
            WHEN ((ual.category)::text = 'login'::text) THEN 1
            ELSE NULL::integer
        END) AS login_count,
    count(
        CASE
            WHEN ((ual.category)::text = 'gaming'::text) THEN 1
            ELSE NULL::integer
        END) AS gaming_actions,
    count(
        CASE
            WHEN ((ual.category)::text = 'financial'::text) THEN 1
            ELSE NULL::integer
        END) AS financial_actions
   FROM (public.users u
     LEFT JOIN public.user_activity_logs ual ON ((u.id = ual.user_id)))
  GROUP BY u.id, u.username;


--
-- Name: user_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_balances (
    user_id integer NOT NULL,
    balance numeric(20,2) DEFAULT 0 NOT NULL,
    bonus_balance numeric(20,2) DEFAULT 0,
    locked_balance numeric(20,2) DEFAULT 0,
    total_deposited numeric(20,2) DEFAULT 0,
    total_withdrawn numeric(20,2) DEFAULT 0,
    total_wagered numeric(20,2) DEFAULT 0,
    total_won numeric(20,2) DEFAULT 0,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_game_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_game_preferences (
    id integer NOT NULL,
    user_id integer,
    game_id integer,
    is_favorite boolean DEFAULT false,
    play_count integer DEFAULT 0,
    total_time_played integer DEFAULT 0,
    last_played_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer DEFAULT 1
);


--
-- Name: user_favorite_games; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_favorite_games AS
 SELECT u.id AS user_id,
    u.username,
    g.name AS game_name,
    g.provider,
    g.category,
    ugp.play_count,
    ugp.total_time_played,
    ugp.last_played_at,
    ugp.is_favorite
   FROM ((public.users u
     JOIN public.user_game_preferences ugp ON ((u.id = ugp.user_id)))
     JOIN public.games g ON ((ugp.game_id = g.id)))
  WHERE ((ugp.is_favorite = true) OR (ugp.play_count > 0))
  ORDER BY ugp.play_count DESC, ugp.last_played_at DESC;


--
-- Name: user_financial_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_financial_summary AS
 SELECT u.id AS user_id,
    u.username,
    ub.balance,
    ub.total_deposited,
    ub.total_withdrawn,
    ub.total_wagered,
    ub.total_won,
    (ub.total_deposited - ub.total_withdrawn) AS net_deposits,
    (ub.total_won - ub.total_wagered) AS net_gaming_profit
   FROM (public.users u
     LEFT JOIN public.user_balances ub ON ((u.id = ub.user_id)));


--
-- Name: user_game_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_game_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_game_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_game_preferences_id_seq OWNED BY public.user_game_preferences.id;


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id integer NOT NULL,
    user_id integer,
    first_name character varying(100),
    last_name character varying(100),
    phone_number character varying(20),
    date_of_birth date,
    nationality character varying(100),
    country character varying(100),
    city character varying(100),
    address text,
    postal_code character varying(20),
    gender character varying(10),
    avatar_url text,
    timezone character varying(50) DEFAULT 'UTC'::character varying,
    language character varying(10) DEFAULT 'en'::character varying,
    currency character varying(3) DEFAULT 'USD'::character varying,
    is_verified boolean DEFAULT false,
    verification_level integer DEFAULT 0,
    last_login_at timestamp with time zone,
    last_activity_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer DEFAULT 1,
    CONSTRAINT user_profiles_gender_check CHECK (((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying])::text[])))
);


--
-- Name: user_gaming_analytics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_gaming_analytics AS
 SELECT u.id AS user_id,
    u.username,
    up.first_name,
    up.last_name,
    count(DISTINCT b.id) AS total_bets,
    sum(b.bet_amount) AS total_wagered,
    sum(b.win_amount) AS total_won,
    (sum(b.win_amount) - sum(b.bet_amount)) AS net_profit,
    count(DISTINCT b.game_id) AS games_played,
    count(DISTINCT date(b.placed_at)) AS active_days,
    avg(b.bet_amount) AS avg_bet_amount,
    max(b.placed_at) AS last_bet_at
   FROM ((public.users u
     LEFT JOIN public.user_profiles up ON ((u.id = up.user_id)))
     LEFT JOIN public.bets b ON ((u.id = b.user_id)))
  GROUP BY u.id, u.username, up.first_name, up.last_name;


--
-- Name: user_kyc_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_kyc_status AS
 SELECT u.id AS user_id,
    u.username,
    up.verification_level,
    up.is_verified,
    kd.status AS kyc_status,
    kd.verified_at,
    count(kd.id) AS documents_submitted
   FROM ((public.users u
     LEFT JOIN public.user_profiles up ON ((u.id = up.user_id)))
     LEFT JOIN public.kyc_documents kd ON ((u.id = kd.user_id)))
  GROUP BY u.id, u.username, up.verification_level, up.is_verified, kd.status, kd.verified_at;


--
-- Name: user_level_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_level_progress (
    id integer NOT NULL,
    user_id integer,
    level_id integer,
    current_points integer DEFAULT 0,
    total_points_earned integer DEFAULT 0,
    level_achieved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer DEFAULT 1
);


--
-- Name: user_level_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_level_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_level_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_level_progress_id_seq OWNED BY public.user_level_progress.id;


--
-- Name: user_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_levels (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    min_points integer NOT NULL,
    max_points integer,
    benefits text[],
    cashback_percentage numeric(5,2) DEFAULT 0,
    withdrawal_limit numeric(20,2),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer DEFAULT 1
);


--
-- Name: user_level_progress_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_level_progress_view AS
 SELECT u.id AS user_id,
    u.username,
    ulp.current_points,
    ulp.total_points_earned,
    ul.name AS current_level,
    ul.description AS level_description,
    ul.benefits AS level_benefits,
    ul.cashback_percentage,
    ulp.level_achieved_at
   FROM ((public.users u
     LEFT JOIN public.user_level_progress ulp ON ((u.id = ulp.user_id)))
     LEFT JOIN public.user_levels ul ON ((ulp.level_id = ul.id)));


--
-- Name: user_levels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_levels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_levels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_levels_id_seq OWNED BY public.user_levels.id;


--
-- Name: user_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_profiles_id_seq OWNED BY public.user_profiles.id;


--
-- Name: user_promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_promotions (
    id integer NOT NULL,
    user_id integer,
    promotion_id integer,
    status character varying(20) DEFAULT 'active'::character varying,
    claimed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    bonus_amount numeric(20,2),
    wagering_completed numeric(20,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer DEFAULT 1,
    CONSTRAINT user_promotions_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: user_promotions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_promotions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_promotions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_promotions_id_seq OWNED BY public.user_promotions.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id integer,
    role_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer DEFAULT 1
);


--
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id integer NOT NULL,
    user_id integer,
    session_id text,
    ip_address inet NOT NULL,
    user_agent text,
    device_type character varying(20),
    browser character varying(50),
    os character varying(50),
    country character varying(100),
    city character varying(100),
    login_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    logout_at timestamp with time zone,
    last_activity_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer DEFAULT 1
);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: bets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bets ALTER COLUMN id SET DEFAULT nextval('public.bets_id_seq'::regclass);


--
-- Name: games id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games ALTER COLUMN id SET DEFAULT nextval('public.games_id_seq'::regclass);


--
-- Name: kyc_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_documents ALTER COLUMN id SET DEFAULT nextval('public.kyc_documents_id_seq'::regclass);


--
-- Name: promotions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions ALTER COLUMN id SET DEFAULT nextval('public.promotions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: statuses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statuses ALTER COLUMN id SET DEFAULT nextval('public.statuses_id_seq'::regclass);


--
-- Name: tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens ALTER COLUMN id SET DEFAULT nextval('public.tokens_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: user_activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs ALTER COLUMN id SET DEFAULT nextval('public.user_activity_logs_id_seq'::regclass);


--
-- Name: user_game_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_game_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_game_preferences_id_seq'::regclass);


--
-- Name: user_level_progress id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_level_progress ALTER COLUMN id SET DEFAULT nextval('public.user_level_progress_id_seq'::regclass);


--
-- Name: user_levels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_levels ALTER COLUMN id SET DEFAULT nextval('public.user_levels_id_seq'::regclass);


--
-- Name: user_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles ALTER COLUMN id SET DEFAULT nextval('public.user_profiles_id_seq'::regclass);


--
-- Name: user_promotions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_promotions ALTER COLUMN id SET DEFAULT nextval('public.user_promotions_id_seq'::regclass);


--
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: bets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bets (id, user_id, game_id, transaction_id, bet_amount, win_amount, multiplier, outcome, game_data, placed_at, result_at, session_id, created_at, created_by) FROM stdin;
1	2	1	\N	10.00	15.00	\N	win	\N	2025-07-05 04:20:19.666396+00	\N	\N	2025-07-05 05:20:19.666396+00	1
\.


--
-- Data for Name: games; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.games (id, name, provider, category, subcategory, image_url, thumbnail_url, game_code, rtp_percentage, volatility, min_bet, max_bet, max_win, is_featured, is_new, is_hot, is_active, created_at, created_by, updated_at, updated_by) FROM stdin;
1	Book of Dead	Play'n GO	Slots	Adventure	\N	\N	book_of_dead	96.21	high	0.10	100.00	500000.00	t	f	f	t	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
2	Starburst	NetEnt	Slots	Fruit	\N	\N	starburst	96.09	low	0.10	100.00	50000.00	t	f	f	t	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
3	Gonzo's Quest	NetEnt	Slots	Adventure	\N	\N	gonzos_quest	95.97	medium	0.20	200.00	2500000.00	f	f	f	t	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
4	Blackjack Classic	Evolution Gaming	Table Games	Blackjack	\N	\N	blackjack_classic	99.50	low	1.00	1000.00	100000.00	f	f	f	t	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
5	Roulette European	Evolution Gaming	Table Games	Roulette	\N	\N	roulette_european	97.30	medium	0.10	5000.00	500000.00	f	f	f	t	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
6	Crazy Monkey	Igrosoft	Slots	Fruit	\N	\N	crazy_monkey	95.00	high	0.01	50.00	100000.00	f	t	f	t	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
\.


--
-- Data for Name: kyc_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kyc_documents (id, user_id, document_type, document_number, document_url, front_image_url, back_image_url, selfie_image_url, status, rejection_reason, verified_at, verified_by, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: promotions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promotions (id, name, description, type, bonus_percentage, max_bonus_amount, min_deposit_amount, wagering_requirement, free_spins_count, start_date, end_date, is_active, created_at, created_by, updated_at, updated_by) FROM stdin;
1	Welcome Bonus	Get 100% bonus on your first deposit	welcome_bonus	100.00	500.00	20.00	35.00	50	2025-07-05 00:00:00+00	2026-07-05 00:00:00+00	t	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
2	Reload Bonus	Get 50% bonus on your deposit	reload_bonus	50.00	200.00	10.00	25.00	25	2025-07-05 00:00:00+00	2026-07-05 00:00:00+00	t	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
3	Free Spins Friday	Get 100 free spins every Friday	free_spins	\N	\N	50.00	20.00	100	2025-07-05 00:00:00+00	2026-07-05 00:00:00+00	t	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
4	Cashback Weekend	Get 10% cashback on weekend losses	cashback	10.00	100.00	\N	\N	\N	2025-07-05 00:00:00+00	2026-07-05 00:00:00+00	t	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, description, created_at, created_by, updated_at, updated_by) FROM stdin;
1	Admin	Full access to the system	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
2	Player	End-user or customer	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
3	Support	Support team member	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
4	Accountant	Handles finances and reports	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
5	Developer	Developer or technical team	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
6	Manager	Casino manager	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
7	Moderator	Content and user moderator	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
\.


--
-- Data for Name: statuses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.statuses (id, name, description, created_at, created_by, updated_at, updated_by) FROM stdin;
1	Active	Can log in and use the system	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
2	Inactive	Disabled or deleted user	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
3	Suspended	Temporarily suspended	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
4	Banned	Permanently banned	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
\.


--
-- Data for Name: tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tokens (id, user_id, access_token, refresh_token, expired_at, is_active, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (id, user_id, type, amount, balance_before, balance_after, currency, reference_id, external_reference, payment_method, status, description, metadata, created_at, created_by) FROM stdin;
1	2	deposit	100.00	0.00	100.00	USD	\N	\N	\N	completed	Initial deposit	\N	2025-07-05 05:20:19.666396+00	1
\.


--
-- Data for Name: user_activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_activity_logs (id, user_id, action, category, description, ip_address, user_agent, session_id, metadata, created_at, created_by) FROM stdin;
1	2	login	authentication	User logged in successfully	192.168.1.1	\N	\N	\N	2025-07-05 05:20:19.666396+00	1
2	2	place_bet	gaming	Placed bet on Book of Dead	192.168.1.1	\N	\N	\N	2025-07-05 05:20:19.666396+00	1
3	4	register	auth	User registered	\N	\N	\N	{"email": "newuser@email.com", "username": "player3", "qr_generated": true, "registration_method": "email"}	2025-07-05 05:24:18.110996+00	1
4	4	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 05:25:42.478647+00	1
\.


--
-- Data for Name: user_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_balances (user_id, balance, bonus_balance, locked_balance, total_deposited, total_withdrawn, total_wagered, total_won, updated_at) FROM stdin;
1	10000.00	0.00	0.00	0.00	0.00	0.00	0.00	2025-07-05 05:20:19.34827+00
2	500.00	0.00	0.00	1000.00	0.00	800.00	1200.00	2025-07-05 05:20:19.666396+00
3	200.00	0.00	0.00	500.00	0.00	300.00	400.00	2025-07-05 05:20:19.666396+00
4	0.00	0.00	0.00	0.00	0.00	0.00	0.00	2025-07-05 05:24:18.110996+00
\.


--
-- Data for Name: user_game_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_game_preferences (id, user_id, game_id, is_favorite, play_count, total_time_played, last_played_at, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: user_level_progress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_level_progress (id, user_id, level_id, current_points, total_points_earned, level_achieved_at, created_at, created_by, updated_at, updated_by) FROM stdin;
1	1	1	0	0	2025-07-05 05:20:19.34827+00	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
2	2	2	1500	1500	2025-07-05 05:20:19.666396+00	2025-07-05 05:20:19.666396+00	1	2025-07-05 05:20:19.666396+00	1
3	3	1	500	500	2025-07-05 05:20:19.666396+00	2025-07-05 05:20:19.666396+00	1	2025-07-05 05:20:19.666396+00	1
4	4	1	0	0	2025-07-05 05:24:18.110996+00	2025-07-05 05:24:18.110996+00	1	2025-07-05 05:24:18.110996+00	1
\.


--
-- Data for Name: user_levels; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_levels (id, name, description, min_points, max_points, benefits, cashback_percentage, withdrawal_limit, created_at, created_by, updated_at, updated_by) FROM stdin;
1	Bronze	New player level	0	999	{"Welcome bonus","Basic support"}	0.50	1000.00	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
2	Silver	Regular player	1000	4999	{"Monthly bonus","Priority support","Faster withdrawals"}	1.00	5000.00	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
3	Gold	Active player	5000	19999	{"Weekly bonus","VIP support","Exclusive games","Higher limits"}	2.00	10000.00	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
4	Platinum	High roller	20000	99999	{"Daily bonus","Personal account manager","Exclusive tournaments"}	3.00	50000.00	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
5	Diamond	VIP player	100000	\N	{"Custom bonuses","24/7 support","Private events","Luxury rewards"}	5.00	100000.00	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_profiles (id, user_id, first_name, last_name, phone_number, date_of_birth, nationality, country, city, address, postal_code, gender, avatar_url, timezone, language, currency, is_verified, verification_level, last_login_at, last_activity_at, created_at, created_by, updated_at, updated_by) FROM stdin;
1	1	Admin	User	+1234567890	\N	United States	United States	\N	\N	\N	\N	\N	UTC	en	USD	t	2	\N	\N	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
2	2	John	Doe	+1234567891	\N	United States	United States	\N	\N	\N	\N	\N	UTC	en	USD	t	1	\N	\N	2025-07-05 05:20:19.666396+00	1	2025-07-05 05:20:19.666396+00	1
3	3	Jane	Smith	+1234567892	\N	Canada	Canada	\N	\N	\N	\N	\N	UTC	en	USD	f	0	\N	\N	2025-07-05 05:20:19.666396+00	1	2025-07-05 05:20:19.666396+00	1
4	4	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	USD	f	0	\N	\N	2025-07-05 05:24:18.110996+00	1	2025-07-05 05:24:18.110996+00	1
\.


--
-- Data for Name: user_promotions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_promotions (id, user_id, promotion_id, status, claimed_at, completed_at, bonus_amount, wagering_completed, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_roles (id, user_id, role_id, created_at, created_by, updated_at, updated_by) FROM stdin;
1	1	1	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:20:19.34827+00	1
2	2	2	2025-07-05 05:20:19.666396+00	1	2025-07-05 05:20:19.666396+00	1
3	3	2	2025-07-05 05:20:19.666396+00	1	2025-07-05 05:20:19.666396+00	1
4	4	2	2025-07-05 05:24:18.110996+00	1	2025-07-05 05:24:18.110996+00	1
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_sessions (id, user_id, session_id, ip_address, user_agent, device_type, browser, os, country, city, login_at, logout_at, last_activity_at, is_active, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, password, auth_secret, qr_code, status_id, created_at, created_by, updated_at, updated_by) FROM stdin;
4	player3	newuser@email.com	$2b$10$djq6.acAbqrb28XMFagfQeO3E/Ka.jEWkF5/YFp.qeVmOIHaLkPGe	OATMNBV5P4PMOP22	<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="200" height="200" fill="#fefefe"/><g transform="scale(4.082)"><g transform="translate(4,4)"><path fill-rule="evenodd" d="M8 0L8 1L12 1L12 2L11 2L11 3L10 3L10 2L8 2L8 5L9 5L9 3L10 3L10 4L11 4L11 3L12 3L12 2L14 2L14 0ZM19 0L19 1L20 1L20 3L21 3L21 2L23 2L23 3L24 3L24 4L22 4L22 5L21 5L21 6L20 6L20 5L19 5L19 4L17 4L17 3L19 3L19 2L17 2L17 3L14 3L14 5L13 5L13 6L12 6L12 5L11 5L11 6L10 6L10 7L9 7L9 6L8 6L8 7L9 7L9 8L8 8L8 9L7 9L7 8L6 8L6 9L4 9L4 8L0 8L0 9L3 9L3 10L1 10L1 12L2 12L2 13L1 13L1 15L3 15L3 16L2 16L2 19L1 19L1 17L0 17L0 21L1 21L1 20L3 20L3 21L2 21L2 22L1 22L1 24L0 24L0 25L1 25L1 26L0 26L0 27L1 27L1 26L2 26L2 28L3 28L3 29L2 29L2 30L4 30L4 31L2 31L2 32L1 32L1 33L2 33L2 32L3 32L3 33L7 33L7 32L6 32L6 31L8 31L8 34L9 34L9 35L10 35L10 34L9 34L9 33L13 33L13 35L12 35L12 36L13 36L13 35L14 35L14 33L15 33L15 34L16 34L16 32L17 32L17 31L18 31L18 33L17 33L17 34L18 34L18 35L17 35L17 36L14 36L14 38L12 38L12 37L8 37L8 41L9 41L9 40L10 40L10 41L12 41L12 40L13 40L13 39L14 39L14 41L15 41L15 40L16 40L16 41L17 41L17 40L18 40L18 41L19 41L19 40L21 40L21 41L25 41L25 40L24 40L24 39L23 39L23 40L21 40L21 39L22 39L22 38L21 38L21 39L20 39L20 38L18 38L18 37L17 37L17 36L18 36L18 35L20 35L20 37L22 37L22 36L21 36L21 35L23 35L23 36L24 36L24 37L23 37L23 38L25 38L25 37L26 37L26 38L27 38L27 39L28 39L28 40L29 40L29 41L31 41L31 40L29 40L29 39L31 39L31 38L32 38L32 37L33 37L33 39L34 39L34 38L35 38L35 40L32 40L32 41L35 41L35 40L36 40L36 37L37 37L37 41L40 41L40 40L41 40L41 38L40 38L40 35L39 35L39 37L38 37L38 36L37 36L37 35L38 35L38 33L37 33L37 32L39 32L39 30L37 30L37 32L35 32L35 31L36 31L36 30L35 30L35 31L34 31L34 32L32 32L32 30L34 30L34 29L39 29L39 28L37 28L37 27L39 27L39 24L40 24L40 22L39 22L39 24L38 24L38 20L39 20L39 18L37 18L37 17L38 17L38 16L37 16L37 14L38 14L38 15L39 15L39 17L40 17L40 16L41 16L41 15L40 15L40 14L41 14L41 13L35 13L35 14L34 14L34 12L33 12L33 11L34 11L34 10L35 10L35 11L38 11L38 9L39 9L39 8L36 8L36 9L34 9L34 8L33 8L33 6L32 6L32 4L31 4L31 3L30 3L30 4L29 4L29 3L28 3L28 2L29 2L29 0L28 0L28 2L24 2L24 1L25 1L25 0L24 0L24 1L23 1L23 0L21 0L21 1L20 1L20 0ZM26 0L26 1L27 1L27 0ZM30 1L30 2L31 2L31 1ZM32 1L32 3L33 3L33 1ZM26 3L26 4L25 4L25 8L27 8L27 9L29 9L29 10L26 10L26 9L24 9L24 5L22 5L22 6L21 6L21 7L20 7L20 6L19 6L19 7L20 7L20 8L21 8L21 9L22 9L22 8L23 8L23 10L22 10L22 12L23 12L23 13L24 13L24 16L26 16L26 13L27 13L27 14L28 14L28 13L27 13L27 11L28 11L28 12L29 12L29 13L30 13L30 14L31 14L31 15L32 15L32 13L33 13L33 12L32 12L32 11L30 11L30 10L31 10L31 7L32 7L32 6L31 6L31 7L30 7L30 6L29 6L29 5L28 5L28 4L27 4L27 3ZM15 4L15 7L14 7L14 6L13 6L13 7L12 7L12 6L11 6L11 9L9 9L9 12L10 12L10 14L11 14L11 12L10 12L10 11L11 11L11 10L12 10L12 12L13 12L13 14L12 14L12 16L11 16L11 18L10 18L10 16L9 16L9 15L8 15L8 14L9 14L9 13L8 13L8 10L7 10L7 9L6 9L6 10L7 10L7 11L4 11L4 12L7 12L7 13L2 13L2 14L3 14L3 15L4 15L4 16L3 16L3 19L4 19L4 22L5 22L5 23L4 23L4 26L3 26L3 22L2 22L2 24L1 24L1 25L2 25L2 26L3 26L3 28L4 28L4 30L5 30L5 31L4 31L4 32L5 32L5 31L6 31L6 30L8 30L8 29L10 29L10 27L9 27L9 26L12 26L12 27L11 27L11 28L12 28L12 29L11 29L11 30L12 30L12 29L14 29L14 27L17 27L17 28L15 28L15 30L14 30L14 31L13 31L13 32L15 32L15 31L17 31L17 30L19 30L19 31L20 31L20 32L23 32L23 34L27 34L27 33L28 33L28 34L29 34L29 35L28 35L28 36L30 36L30 34L31 34L31 37L30 37L30 38L31 38L31 37L32 37L32 33L28 33L28 32L27 32L27 31L25 31L25 32L24 32L24 31L22 31L22 29L20 29L20 28L21 28L21 27L20 27L20 26L23 26L23 27L22 27L22 28L23 28L23 27L24 27L24 26L25 26L25 29L23 29L23 30L25 30L25 29L26 29L26 27L27 27L27 30L30 30L30 31L29 31L29 32L31 32L31 30L32 30L32 29L34 29L34 28L31 28L31 30L30 30L30 28L29 28L29 25L30 25L30 26L32 26L32 25L33 25L33 26L35 26L35 27L36 27L36 26L35 26L35 25L36 25L36 24L37 24L37 23L36 23L36 22L37 22L37 20L38 20L38 19L37 19L37 18L36 18L36 17L34 17L34 18L32 18L32 17L33 17L33 16L28 16L28 15L27 15L27 17L28 17L28 18L27 18L27 19L29 19L29 18L30 18L30 20L31 20L31 18L32 18L32 19L33 19L33 20L32 20L32 21L28 21L28 20L26 20L26 18L25 18L25 20L26 20L26 21L24 21L24 17L23 17L23 18L22 18L22 16L23 16L23 14L22 14L22 13L20 13L20 9L19 9L19 8L18 8L18 9L17 9L17 10L16 10L16 8L17 8L17 7L18 7L18 6L17 6L17 4ZM26 5L26 7L27 7L27 8L28 8L28 7L29 7L29 9L30 9L30 7L29 7L29 6L28 6L28 5ZM16 6L16 7L17 7L17 6ZM22 6L22 7L21 7L21 8L22 8L22 7L23 7L23 6ZM27 6L27 7L28 7L28 6ZM14 8L14 9L15 9L15 8ZM32 8L32 10L34 10L34 9L33 9L33 8ZM40 8L40 9L41 9L41 8ZM12 9L12 10L13 10L13 9ZM18 9L18 10L19 10L19 9ZM36 9L36 10L37 10L37 9ZM14 10L14 11L13 11L13 12L15 12L15 13L16 13L16 14L15 14L15 15L14 15L14 16L15 16L15 17L14 17L14 18L13 18L13 19L11 19L11 20L10 20L10 19L9 19L9 16L8 16L8 15L7 15L7 14L6 14L6 15L5 15L5 18L4 18L4 19L5 19L5 18L6 18L6 19L7 19L7 20L5 20L5 21L7 21L7 20L8 20L8 19L9 19L9 20L10 20L10 22L9 22L9 23L8 23L8 24L6 24L6 23L7 23L7 22L6 22L6 23L5 23L5 26L4 26L4 27L5 27L5 29L8 29L8 27L7 27L7 26L6 26L6 25L9 25L9 24L10 24L10 25L11 25L11 24L10 24L10 22L11 22L11 23L13 23L13 24L15 24L15 25L14 25L14 26L13 26L13 25L12 25L12 26L13 26L13 27L14 27L14 26L15 26L15 25L16 25L16 26L18 26L18 25L16 25L16 24L17 24L17 22L16 22L16 21L15 21L15 17L18 17L18 18L17 18L17 19L16 19L16 20L19 20L19 21L18 21L18 24L19 24L19 23L20 23L20 25L19 25L19 26L20 26L20 25L21 25L21 24L22 24L22 25L23 25L23 26L24 26L24 25L25 25L25 24L26 24L26 25L27 25L27 27L28 27L28 21L26 21L26 22L25 22L25 23L24 23L24 21L23 21L23 23L22 23L22 20L23 20L23 19L22 19L22 20L20 20L20 19L21 19L21 18L20 18L20 19L19 19L19 16L21 16L21 15L22 15L22 14L21 14L21 15L19 15L19 14L20 14L20 13L19 13L19 11L18 11L18 12L17 12L17 13L16 13L16 12L15 12L15 11L16 11L16 10ZM40 10L40 11L41 11L41 10ZM2 11L2 12L3 12L3 11ZM23 11L23 12L25 12L25 11ZM29 11L29 12L30 12L30 11ZM33 14L33 15L34 15L34 14ZM35 14L35 15L36 15L36 14ZM6 15L6 16L7 16L7 17L6 17L6 18L7 18L7 19L8 19L8 18L7 18L7 17L8 17L8 16L7 16L7 15ZM15 15L15 16L16 16L16 15ZM17 15L17 16L18 16L18 15ZM30 17L30 18L31 18L31 17ZM35 18L35 19L34 19L34 22L33 22L33 21L32 21L32 22L33 22L33 23L32 23L32 24L34 24L34 22L36 22L36 18ZM40 19L40 21L41 21L41 19ZM11 20L11 22L12 22L12 20ZM13 21L13 23L15 23L15 24L16 24L16 22L15 22L15 21ZM19 21L19 22L21 22L21 21ZM26 22L26 24L27 24L27 22ZM30 22L30 25L31 25L31 22ZM23 24L23 25L24 25L24 24ZM40 25L40 28L41 28L41 25ZM6 27L6 28L7 28L7 27ZM18 27L18 28L17 28L17 29L18 29L18 28L20 28L20 27ZM40 29L40 30L41 30L41 29ZM0 30L0 31L1 31L1 30ZM20 30L20 31L21 31L21 30ZM9 31L9 32L12 32L12 31ZM40 31L40 32L41 32L41 31ZM18 33L18 34L20 34L20 33ZM33 33L33 36L36 36L36 33ZM39 33L39 34L41 34L41 33ZM34 34L34 35L35 35L35 34ZM24 35L24 36L25 36L25 35ZM26 35L26 36L27 36L27 35ZM15 37L15 39L16 39L16 40L17 40L17 39L18 39L18 38L17 38L17 37ZM27 37L27 38L29 38L29 37ZM10 38L10 39L11 39L11 40L12 40L12 38ZM39 38L39 39L38 39L38 40L40 40L40 38ZM0 0L0 7L7 7L7 0ZM1 1L1 6L6 6L6 1ZM2 2L2 5L5 5L5 2ZM34 0L34 7L41 7L41 0ZM35 1L35 6L40 6L40 1ZM36 2L36 5L39 5L39 2ZM0 34L0 41L7 41L7 34ZM1 35L1 40L6 40L6 35ZM2 36L2 39L5 39L5 36Z" fill="#000000"/></g></g></svg>\n	1	2025-07-05 05:24:18.110996+00	1	2025-07-05 05:24:18.110996+00	1
1	admin	admin@casino.com	$2b$10$YQRnR/9U2NCOUFPnMT.JJ.SVi/Di4S5hzAgt0/4f3neMfmULWUKYq	OATMNBV5P4PMOP22	<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="200" height="200" fill="#fefefe"/><g transform="scale(4.082)"><g transform="translate(4,4)"><path fill-rule="evenodd" d="M8 0L8 1L12 1L12 2L11 2L11 3L10 3L10 2L8 2L8 5L9 5L9 3L10 3L10 4L11 4L11 3L12 3L12 2L14 2L14 0ZM19 0L19 1L20 1L20 3L21 3L21 2L23 2L23 3L24 3L24 4L22 4L22 5L21 5L21 6L20 6L20 5L19 5L19 4L17 4L17 3L19 3L19 2L17 2L17 3L14 3L14 5L13 5L13 6L12 6L12 5L11 5L11 6L10 6L10 7L9 7L9 6L8 6L8 7L9 7L9 8L8 8L8 9L7 9L7 8L6 8L6 9L4 9L4 8L0 8L0 9L3 9L3 10L1 10L1 12L2 12L2 13L1 13L1 15L3 15L3 16L2 16L2 19L1 19L1 17L0 17L0 21L1 21L1 20L3 20L3 21L2 21L2 22L1 22L1 24L0 24L0 25L1 25L1 26L0 26L0 27L1 27L1 26L2 26L2 28L3 28L3 29L2 29L2 30L4 30L4 31L2 31L2 32L1 32L1 33L2 33L2 32L3 32L3 33L7 33L7 32L6 32L6 31L8 31L8 34L9 34L9 35L10 35L10 34L9 34L9 33L13 33L13 35L12 35L12 36L13 36L13 35L14 35L14 33L15 33L15 34L16 34L16 32L17 32L17 31L18 31L18 33L17 33L17 34L18 34L18 35L17 35L17 36L14 36L14 38L12 38L12 37L8 37L8 41L9 41L9 40L10 40L10 41L12 41L12 40L13 40L13 39L14 39L14 41L15 41L15 40L16 40L16 41L17 41L17 40L18 40L18 41L19 41L19 40L21 40L21 41L25 41L25 40L24 40L24 39L23 39L23 40L21 40L21 39L22 39L22 38L21 38L21 39L20 39L20 38L18 38L18 37L17 37L17 36L18 36L18 35L20 35L20 37L22 37L22 36L21 36L21 35L23 35L23 36L24 36L24 37L23 37L23 38L25 38L25 37L26 37L26 38L27 38L27 39L28 39L28 40L29 40L29 41L31 41L31 40L29 40L29 39L31 39L31 38L32 38L32 37L33 37L33 39L34 39L34 38L35 38L35 40L32 40L32 41L35 41L35 40L36 40L36 37L37 37L37 41L40 41L40 40L41 40L41 38L40 38L40 35L39 35L39 37L38 37L38 36L37 36L37 35L38 35L38 33L37 33L37 32L39 32L39 30L37 30L37 32L35 32L35 31L36 31L36 30L35 30L35 31L34 31L34 32L32 32L32 30L34 30L34 29L39 29L39 28L37 28L37 27L39 27L39 24L40 24L40 22L39 22L39 24L38 24L38 20L39 20L39 18L37 18L37 17L38 17L38 16L37 16L37 14L38 14L38 15L39 15L39 17L40 17L40 16L41 16L41 15L40 15L40 14L41 14L41 13L35 13L35 14L34 14L34 12L33 12L33 11L34 11L34 10L35 10L35 11L38 11L38 9L39 9L39 8L36 8L36 9L34 9L34 8L33 8L33 6L32 6L32 4L31 4L31 3L30 3L30 4L29 4L29 3L28 3L28 2L29 2L29 0L28 0L28 2L24 2L24 1L25 1L25 0L24 0L24 1L23 1L23 0L21 0L21 1L20 1L20 0ZM26 0L26 1L27 1L27 0ZM30 1L30 2L31 2L31 1ZM32 1L32 3L33 3L33 1ZM26 3L26 4L25 4L25 8L27 8L27 9L29 9L29 10L26 10L26 9L24 9L24 5L22 5L22 6L21 6L21 7L20 7L20 6L19 6L19 7L20 7L20 8L21 8L21 9L22 9L22 8L23 8L23 10L22 10L22 12L23 12L23 13L24 13L24 16L26 16L26 13L27 13L27 14L28 14L28 13L27 13L27 11L28 11L28 12L29 12L29 13L30 13L30 14L31 14L31 15L32 15L32 13L33 13L33 12L32 12L32 11L30 11L30 10L31 10L31 7L32 7L32 6L31 6L31 7L30 7L30 6L29 6L29 5L28 5L28 4L27 4L27 3ZM15 4L15 7L14 7L14 6L13 6L13 7L12 7L12 6L11 6L11 9L9 9L9 12L10 12L10 14L11 14L11 12L10 12L10 11L11 11L11 10L12 10L12 12L13 12L13 14L12 14L12 16L11 16L11 18L10 18L10 16L9 16L9 15L8 15L8 14L9 14L9 13L8 13L8 10L7 10L7 9L6 9L6 10L7 10L7 11L4 11L4 12L7 12L7 13L2 13L2 14L3 14L3 15L4 15L4 16L3 16L3 19L4 19L4 22L5 22L5 23L4 23L4 26L3 26L3 22L2 22L2 24L1 24L1 25L2 25L2 26L3 26L3 28L4 28L4 30L5 30L5 31L4 31L4 32L5 32L5 31L6 31L6 30L8 30L8 29L10 29L10 27L9 27L9 26L12 26L12 27L11 27L11 28L12 28L12 29L11 29L11 30L12 30L12 29L14 29L14 27L17 27L17 28L15 28L15 30L14 30L14 31L13 31L13 32L15 32L15 31L17 31L17 30L19 30L19 31L20 31L20 32L23 32L23 34L27 34L27 33L28 33L28 34L29 34L29 35L28 35L28 36L30 36L30 34L31 34L31 37L30 37L30 38L31 38L31 37L32 37L32 33L28 33L28 32L27 32L27 31L25 31L25 32L24 32L24 31L22 31L22 29L20 29L20 28L21 28L21 27L20 27L20 26L23 26L23 27L22 27L22 28L23 28L23 27L24 27L24 26L25 26L25 29L23 29L23 30L25 30L25 29L26 29L26 27L27 27L27 30L30 30L30 31L29 31L29 32L31 32L31 30L32 30L32 29L34 29L34 28L31 28L31 30L30 30L30 28L29 28L29 25L30 25L30 26L32 26L32 25L33 25L33 26L35 26L35 27L36 27L36 26L35 26L35 25L36 25L36 24L37 24L37 23L36 23L36 22L37 22L37 20L38 20L38 19L37 19L37 18L36 18L36 17L34 17L34 18L32 18L32 17L33 17L33 16L28 16L28 15L27 15L27 17L28 17L28 18L27 18L27 19L29 19L29 18L30 18L30 20L31 20L31 18L32 18L32 19L33 19L33 20L32 20L32 21L28 21L28 20L26 20L26 18L25 18L25 20L26 20L26 21L24 21L24 17L23 17L23 18L22 18L22 16L23 16L23 14L22 14L22 13L20 13L20 9L19 9L19 8L18 8L18 9L17 9L17 10L16 10L16 8L17 8L17 7L18 7L18 6L17 6L17 4ZM26 5L26 7L27 7L27 8L28 8L28 7L29 7L29 9L30 9L30 7L29 7L29 6L28 6L28 5ZM16 6L16 7L17 7L17 6ZM22 6L22 7L21 7L21 8L22 8L22 7L23 7L23 6ZM27 6L27 7L28 7L28 6ZM14 8L14 9L15 9L15 8ZM32 8L32 10L34 10L34 9L33 9L33 8ZM40 8L40 9L41 9L41 8ZM12 9L12 10L13 10L13 9ZM18 9L18 10L19 10L19 9ZM36 9L36 10L37 10L37 9ZM14 10L14 11L13 11L13 12L15 12L15 13L16 13L16 14L15 14L15 15L14 15L14 16L15 16L15 17L14 17L14 18L13 18L13 19L11 19L11 20L10 20L10 19L9 19L9 16L8 16L8 15L7 15L7 14L6 14L6 15L5 15L5 18L4 18L4 19L5 19L5 18L6 18L6 19L7 19L7 20L5 20L5 21L7 21L7 20L8 20L8 19L9 19L9 20L10 20L10 22L9 22L9 23L8 23L8 24L6 24L6 23L7 23L7 22L6 22L6 23L5 23L5 26L4 26L4 27L5 27L5 29L8 29L8 27L7 27L7 26L6 26L6 25L9 25L9 24L10 24L10 25L11 25L11 24L10 24L10 22L11 22L11 23L13 23L13 24L15 24L15 25L14 25L14 26L13 26L13 25L12 25L12 26L13 26L13 27L14 27L14 26L15 26L15 25L16 25L16 26L18 26L18 25L16 25L16 24L17 24L17 22L16 22L16 21L15 21L15 17L18 17L18 18L17 18L17 19L16 19L16 20L19 20L19 21L18 21L18 24L19 24L19 23L20 23L20 25L19 25L19 26L20 26L20 25L21 25L21 24L22 24L22 25L23 25L23 26L24 26L24 25L25 25L25 24L26 24L26 25L27 25L27 27L28 27L28 21L26 21L26 22L25 22L25 23L24 23L24 21L23 21L23 23L22 23L22 20L23 20L23 19L22 19L22 20L20 20L20 19L21 19L21 18L20 18L20 19L19 19L19 16L21 16L21 15L22 15L22 14L21 14L21 15L19 15L19 14L20 14L20 13L19 13L19 11L18 11L18 12L17 12L17 13L16 13L16 12L15 12L15 11L16 11L16 10ZM40 10L40 11L41 11L41 10ZM2 11L2 12L3 12L3 11ZM23 11L23 12L25 12L25 11ZM29 11L29 12L30 12L30 11ZM33 14L33 15L34 15L34 14ZM35 14L35 15L36 15L36 14ZM6 15L6 16L7 16L7 17L6 17L6 18L7 18L7 19L8 19L8 18L7 18L7 17L8 17L8 16L7 16L7 15ZM15 15L15 16L16 16L16 15ZM17 15L17 16L18 16L18 15ZM30 17L30 18L31 18L31 17ZM35 18L35 19L34 19L34 22L33 22L33 21L32 21L32 22L33 22L33 23L32 23L32 24L34 24L34 22L36 22L36 18ZM40 19L40 21L41 21L41 19ZM11 20L11 22L12 22L12 20ZM13 21L13 23L15 23L15 24L16 24L16 22L15 22L15 21ZM19 21L19 22L21 22L21 21ZM26 22L26 24L27 24L27 22ZM30 22L30 25L31 25L31 22ZM23 24L23 25L24 25L24 24ZM40 25L40 28L41 28L41 25ZM6 27L6 28L7 28L7 27ZM18 27L18 28L17 28L17 29L18 29L18 28L20 28L20 27ZM40 29L40 30L41 30L41 29ZM0 30L0 31L1 31L1 30ZM20 30L20 31L21 31L21 30ZM9 31L9 32L12 32L12 31ZM40 31L40 32L41 32L41 31ZM18 33L18 34L20 34L20 33ZM33 33L33 36L36 36L36 33ZM39 33L39 34L41 34L41 33ZM34 34L34 35L35 35L35 34ZM24 35L24 36L25 36L25 35ZM26 35L26 36L27 36L27 35ZM15 37L15 39L16 39L16 40L17 40L17 39L18 39L18 38L17 38L17 37ZM27 37L27 38L29 38L29 37ZM10 38L10 39L11 39L11 40L12 40L12 38ZM39 38L39 39L38 39L38 40L40 40L40 38ZM0 0L0 7L7 7L7 0ZM1 1L1 6L6 6L6 1ZM2 2L2 5L5 5L5 2ZM34 0L34 7L41 7L41 0ZM35 1L35 6L40 6L40 1ZM36 2L36 5L39 5L39 2ZM0 34L0 41L7 41L7 34ZM1 35L1 40L6 40L6 35ZM2 36L2 39L5 39L5 36Z" fill="#000000"/></g></g></svg>\n	1	2025-07-05 05:20:19.34827+00	1	2025-07-05 05:26:17.247462+00	1
2	player1	player1@example.com	$2b$10$YQRnR/9U2NCOUFPnMT.JJ.SVi/Di4S5hzAgt0/4f3neMfmULWUKYq	OATMNBV5P4PMOP22	<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="200" height="200" fill="#fefefe"/><g transform="scale(4.082)"><g transform="translate(4,4)"><path fill-rule="evenodd" d="M8 0L8 1L12 1L12 2L11 2L11 3L10 3L10 2L8 2L8 5L9 5L9 3L10 3L10 4L11 4L11 3L12 3L12 2L14 2L14 0ZM19 0L19 1L20 1L20 3L21 3L21 2L23 2L23 3L24 3L24 4L22 4L22 5L21 5L21 6L20 6L20 5L19 5L19 4L17 4L17 3L19 3L19 2L17 2L17 3L14 3L14 5L13 5L13 6L12 6L12 5L11 5L11 6L10 6L10 7L9 7L9 6L8 6L8 7L9 7L9 8L8 8L8 9L7 9L7 8L6 8L6 9L4 9L4 8L0 8L0 9L3 9L3 10L1 10L1 12L2 12L2 13L1 13L1 15L3 15L3 16L2 16L2 19L1 19L1 17L0 17L0 21L1 21L1 20L3 20L3 21L2 21L2 22L1 22L1 24L0 24L0 25L1 25L1 26L0 26L0 27L1 27L1 26L2 26L2 28L3 28L3 29L2 29L2 30L4 30L4 31L2 31L2 32L1 32L1 33L2 33L2 32L3 32L3 33L7 33L7 32L6 32L6 31L8 31L8 34L9 34L9 35L10 35L10 34L9 34L9 33L13 33L13 35L12 35L12 36L13 36L13 35L14 35L14 33L15 33L15 34L16 34L16 32L17 32L17 31L18 31L18 33L17 33L17 34L18 34L18 35L17 35L17 36L14 36L14 38L12 38L12 37L8 37L8 41L9 41L9 40L10 40L10 41L12 41L12 40L13 40L13 39L14 39L14 41L15 41L15 40L16 40L16 41L17 41L17 40L18 40L18 41L19 41L19 40L21 40L21 41L25 41L25 40L24 40L24 39L23 39L23 40L21 40L21 39L22 39L22 38L21 38L21 39L20 39L20 38L18 38L18 37L17 37L17 36L18 36L18 35L20 35L20 37L22 37L22 36L21 36L21 35L23 35L23 36L24 36L24 37L23 37L23 38L25 38L25 37L26 37L26 38L27 38L27 39L28 39L28 40L29 40L29 41L31 41L31 40L29 40L29 39L31 39L31 38L32 38L32 37L33 37L33 39L34 39L34 38L35 38L35 40L32 40L32 41L35 41L35 40L36 40L36 37L37 37L37 41L40 41L40 40L41 40L41 38L40 38L40 35L39 35L39 37L38 37L38 36L37 36L37 35L38 35L38 33L37 33L37 32L39 32L39 30L37 30L37 32L35 32L35 31L36 31L36 30L35 30L35 31L34 31L34 32L32 32L32 30L34 30L34 29L39 29L39 28L37 28L37 27L39 27L39 24L40 24L40 22L39 22L39 24L38 24L38 20L39 20L39 18L37 18L37 17L38 17L38 16L37 16L37 14L38 14L38 15L39 15L39 17L40 17L40 16L41 16L41 15L40 15L40 14L41 14L41 13L35 13L35 14L34 14L34 12L33 12L33 11L34 11L34 10L35 10L35 11L38 11L38 9L39 9L39 8L36 8L36 9L34 9L34 8L33 8L33 6L32 6L32 4L31 4L31 3L30 3L30 4L29 4L29 3L28 3L28 2L29 2L29 0L28 0L28 2L24 2L24 1L25 1L25 0L24 0L24 1L23 1L23 0L21 0L21 1L20 1L20 0ZM26 0L26 1L27 1L27 0ZM30 1L30 2L31 2L31 1ZM32 1L32 3L33 3L33 1ZM26 3L26 4L25 4L25 8L27 8L27 9L29 9L29 10L26 10L26 9L24 9L24 5L22 5L22 6L21 6L21 7L20 7L20 6L19 6L19 7L20 7L20 8L21 8L21 9L22 9L22 8L23 8L23 10L22 10L22 12L23 12L23 13L24 13L24 16L26 16L26 13L27 13L27 14L28 14L28 13L27 13L27 11L28 11L28 12L29 12L29 13L30 13L30 14L31 14L31 15L32 15L32 13L33 13L33 12L32 12L32 11L30 11L30 10L31 10L31 7L32 7L32 6L31 6L31 7L30 7L30 6L29 6L29 5L28 5L28 4L27 4L27 3ZM15 4L15 7L14 7L14 6L13 6L13 7L12 7L12 6L11 6L11 9L9 9L9 12L10 12L10 14L11 14L11 12L10 12L10 11L11 11L11 10L12 10L12 12L13 12L13 14L12 14L12 16L11 16L11 18L10 18L10 16L9 16L9 15L8 15L8 14L9 14L9 13L8 13L8 10L7 10L7 9L6 9L6 10L7 10L7 11L4 11L4 12L7 12L7 13L2 13L2 14L3 14L3 15L4 15L4 16L3 16L3 19L4 19L4 22L5 22L5 23L4 23L4 26L3 26L3 22L2 22L2 24L1 24L1 25L2 25L2 26L3 26L3 28L4 28L4 30L5 30L5 31L4 31L4 32L5 32L5 31L6 31L6 30L8 30L8 29L10 29L10 27L9 27L9 26L12 26L12 27L11 27L11 28L12 28L12 29L11 29L11 30L12 30L12 29L14 29L14 27L17 27L17 28L15 28L15 30L14 30L14 31L13 31L13 32L15 32L15 31L17 31L17 30L19 30L19 31L20 31L20 32L23 32L23 34L27 34L27 33L28 33L28 34L29 34L29 35L28 35L28 36L30 36L30 34L31 34L31 37L30 37L30 38L31 38L31 37L32 37L32 33L28 33L28 32L27 32L27 31L25 31L25 32L24 32L24 31L22 31L22 29L20 29L20 28L21 28L21 27L20 27L20 26L23 26L23 27L22 27L22 28L23 28L23 27L24 27L24 26L25 26L25 29L23 29L23 30L25 30L25 29L26 29L26 27L27 27L27 30L30 30L30 31L29 31L29 32L31 32L31 30L32 30L32 29L34 29L34 28L31 28L31 30L30 30L30 28L29 28L29 25L30 25L30 26L32 26L32 25L33 25L33 26L35 26L35 27L36 27L36 26L35 26L35 25L36 25L36 24L37 24L37 23L36 23L36 22L37 22L37 20L38 20L38 19L37 19L37 18L36 18L36 17L34 17L34 18L32 18L32 17L33 17L33 16L28 16L28 15L27 15L27 17L28 17L28 18L27 18L27 19L29 19L29 18L30 18L30 20L31 20L31 18L32 18L32 19L33 19L33 20L32 20L32 21L28 21L28 20L26 20L26 18L25 18L25 20L26 20L26 21L24 21L24 17L23 17L23 18L22 18L22 16L23 16L23 14L22 14L22 13L20 13L20 9L19 9L19 8L18 8L18 9L17 9L17 10L16 10L16 8L17 8L17 7L18 7L18 6L17 6L17 4ZM26 5L26 7L27 7L27 8L28 8L28 7L29 7L29 9L30 9L30 7L29 7L29 6L28 6L28 5ZM16 6L16 7L17 7L17 6ZM22 6L22 7L21 7L21 8L22 8L22 7L23 7L23 6ZM27 6L27 7L28 7L28 6ZM14 8L14 9L15 9L15 8ZM32 8L32 10L34 10L34 9L33 9L33 8ZM40 8L40 9L41 9L41 8ZM12 9L12 10L13 10L13 9ZM18 9L18 10L19 10L19 9ZM36 9L36 10L37 10L37 9ZM14 10L14 11L13 11L13 12L15 12L15 13L16 13L16 14L15 14L15 15L14 15L14 16L15 16L15 17L14 17L14 18L13 18L13 19L11 19L11 20L10 20L10 19L9 19L9 16L8 16L8 15L7 15L7 14L6 14L6 15L5 15L5 18L4 18L4 19L5 19L5 18L6 18L6 19L7 19L7 20L5 20L5 21L7 21L7 20L8 20L8 19L9 19L9 20L10 20L10 22L9 22L9 23L8 23L8 24L6 24L6 23L7 23L7 22L6 22L6 23L5 23L5 26L4 26L4 27L5 27L5 29L8 29L8 27L7 27L7 26L6 26L6 25L9 25L9 24L10 24L10 25L11 25L11 24L10 24L10 22L11 22L11 23L13 23L13 24L15 24L15 25L14 25L14 26L13 26L13 25L12 25L12 26L13 26L13 27L14 27L14 26L15 26L15 25L16 25L16 26L18 26L18 25L16 25L16 24L17 24L17 22L16 22L16 21L15 21L15 17L18 17L18 18L17 18L17 19L16 19L16 20L19 20L19 21L18 21L18 24L19 24L19 23L20 23L20 25L19 25L19 26L20 26L20 25L21 25L21 24L22 24L22 25L23 25L23 26L24 26L24 25L25 25L25 24L26 24L26 25L27 25L27 27L28 27L28 21L26 21L26 22L25 22L25 23L24 23L24 21L23 21L23 23L22 23L22 20L23 20L23 19L22 19L22 20L20 20L20 19L21 19L21 18L20 18L20 19L19 19L19 16L21 16L21 15L22 15L22 14L21 14L21 15L19 15L19 14L20 14L20 13L19 13L19 11L18 11L18 12L17 12L17 13L16 13L16 12L15 12L15 11L16 11L16 10ZM40 10L40 11L41 11L41 10ZM2 11L2 12L3 12L3 11ZM23 11L23 12L25 12L25 11ZM29 11L29 12L30 12L30 11ZM33 14L33 15L34 15L34 14ZM35 14L35 15L36 15L36 14ZM6 15L6 16L7 16L7 17L6 17L6 18L7 18L7 19L8 19L8 18L7 18L7 17L8 17L8 16L7 16L7 15ZM15 15L15 16L16 16L16 15ZM17 15L17 16L18 16L18 15ZM30 17L30 18L31 18L31 17ZM35 18L35 19L34 19L34 22L33 22L33 21L32 21L32 22L33 22L33 23L32 23L32 24L34 24L34 22L36 22L36 18ZM40 19L40 21L41 21L41 19ZM11 20L11 22L12 22L12 20ZM13 21L13 23L15 23L15 24L16 24L16 22L15 22L15 21ZM19 21L19 22L21 22L21 21ZM26 22L26 24L27 24L27 22ZM30 22L30 25L31 25L31 22ZM23 24L23 25L24 25L24 24ZM40 25L40 28L41 28L41 25ZM6 27L6 28L7 28L7 27ZM18 27L18 28L17 28L17 29L18 29L18 28L20 28L20 27ZM40 29L40 30L41 30L41 29ZM0 30L0 31L1 31L1 30ZM20 30L20 31L21 31L21 30ZM9 31L9 32L12 32L12 31ZM40 31L40 32L41 32L41 31ZM18 33L18 34L20 34L20 33ZM33 33L33 36L36 36L36 33ZM39 33L39 34L41 34L41 33ZM34 34L34 35L35 35L35 34ZM24 35L24 36L25 36L25 35ZM26 35L26 36L27 36L27 35ZM15 37L15 39L16 39L16 40L17 40L17 39L18 39L18 38L17 38L17 37ZM27 37L27 38L29 38L29 37ZM10 38L10 39L11 39L11 40L12 40L12 38ZM39 38L39 39L38 39L38 40L40 40L40 38ZM0 0L0 7L7 7L7 0ZM1 1L1 6L6 6L6 1ZM2 2L2 5L5 5L5 2ZM34 0L34 7L41 7L41 0ZM35 1L35 6L40 6L40 1ZM36 2L36 5L39 5L39 2ZM0 34L0 41L7 41L7 34ZM1 35L1 40L6 40L6 35ZM2 36L2 39L5 39L5 36Z" fill="#000000"/></g></g></svg>\n	1	2025-07-05 05:20:19.666396+00	1	2025-07-05 05:26:17.247462+00	1
3	player2	player2@example.com	$2b$10$YQRnR/9U2NCOUFPnMT.JJ.SVi/Di4S5hzAgt0/4f3neMfmULWUKYq	OATMNBV5P4PMOP22	<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="200" height="200" fill="#fefefe"/><g transform="scale(4.082)"><g transform="translate(4,4)"><path fill-rule="evenodd" d="M8 0L8 1L12 1L12 2L11 2L11 3L10 3L10 2L8 2L8 5L9 5L9 3L10 3L10 4L11 4L11 3L12 3L12 2L14 2L14 0ZM19 0L19 1L20 1L20 3L21 3L21 2L23 2L23 3L24 3L24 4L22 4L22 5L21 5L21 6L20 6L20 5L19 5L19 4L17 4L17 3L19 3L19 2L17 2L17 3L14 3L14 5L13 5L13 6L12 6L12 5L11 5L11 6L10 6L10 7L9 7L9 6L8 6L8 7L9 7L9 8L8 8L8 9L7 9L7 8L6 8L6 9L4 9L4 8L0 8L0 9L3 9L3 10L1 10L1 12L2 12L2 13L1 13L1 15L3 15L3 16L2 16L2 19L1 19L1 17L0 17L0 21L1 21L1 20L3 20L3 21L2 21L2 22L1 22L1 24L0 24L0 25L1 25L1 26L0 26L0 27L1 27L1 26L2 26L2 28L3 28L3 29L2 29L2 30L4 30L4 31L2 31L2 32L1 32L1 33L2 33L2 32L3 32L3 33L7 33L7 32L6 32L6 31L8 31L8 34L9 34L9 35L10 35L10 34L9 34L9 33L13 33L13 35L12 35L12 36L13 36L13 35L14 35L14 33L15 33L15 34L16 34L16 32L17 32L17 31L18 31L18 33L17 33L17 34L18 34L18 35L17 35L17 36L14 36L14 38L12 38L12 37L8 37L8 41L9 41L9 40L10 40L10 41L12 41L12 40L13 40L13 39L14 39L14 41L15 41L15 40L16 40L16 41L17 41L17 40L18 40L18 41L19 41L19 40L21 40L21 41L25 41L25 40L24 40L24 39L23 39L23 40L21 40L21 39L22 39L22 38L21 38L21 39L20 39L20 38L18 38L18 37L17 37L17 36L18 36L18 35L20 35L20 37L22 37L22 36L21 36L21 35L23 35L23 36L24 36L24 37L23 37L23 38L25 38L25 37L26 37L26 38L27 38L27 39L28 39L28 40L29 40L29 41L31 41L31 40L29 40L29 39L31 39L31 38L32 38L32 37L33 37L33 39L34 39L34 38L35 38L35 40L32 40L32 41L35 41L35 40L36 40L36 37L37 37L37 41L40 41L40 40L41 40L41 38L40 38L40 35L39 35L39 37L38 37L38 36L37 36L37 35L38 35L38 33L37 33L37 32L39 32L39 30L37 30L37 32L35 32L35 31L36 31L36 30L35 30L35 31L34 31L34 32L32 32L32 30L34 30L34 29L39 29L39 28L37 28L37 27L39 27L39 24L40 24L40 22L39 22L39 24L38 24L38 20L39 20L39 18L37 18L37 17L38 17L38 16L37 16L37 14L38 14L38 15L39 15L39 17L40 17L40 16L41 16L41 15L40 15L40 14L41 14L41 13L35 13L35 14L34 14L34 12L33 12L33 11L34 11L34 10L35 10L35 11L38 11L38 9L39 9L39 8L36 8L36 9L34 9L34 8L33 8L33 6L32 6L32 4L31 4L31 3L30 3L30 4L29 4L29 3L28 3L28 2L29 2L29 0L28 0L28 2L24 2L24 1L25 1L25 0L24 0L24 1L23 1L23 0L21 0L21 1L20 1L20 0ZM26 0L26 1L27 1L27 0ZM30 1L30 2L31 2L31 1ZM32 1L32 3L33 3L33 1ZM26 3L26 4L25 4L25 8L27 8L27 9L29 9L29 10L26 10L26 9L24 9L24 5L22 5L22 6L21 6L21 7L20 7L20 6L19 6L19 7L20 7L20 8L21 8L21 9L22 9L22 8L23 8L23 10L22 10L22 12L23 12L23 13L24 13L24 16L26 16L26 13L27 13L27 14L28 14L28 13L27 13L27 11L28 11L28 12L29 12L29 13L30 13L30 14L31 14L31 15L32 15L32 13L33 13L33 12L32 12L32 11L30 11L30 10L31 10L31 7L32 7L32 6L31 6L31 7L30 7L30 6L29 6L29 5L28 5L28 4L27 4L27 3ZM15 4L15 7L14 7L14 6L13 6L13 7L12 7L12 6L11 6L11 9L9 9L9 12L10 12L10 14L11 14L11 12L10 12L10 11L11 11L11 10L12 10L12 12L13 12L13 14L12 14L12 16L11 16L11 18L10 18L10 16L9 16L9 15L8 15L8 14L9 14L9 13L8 13L8 10L7 10L7 9L6 9L6 10L7 10L7 11L4 11L4 12L7 12L7 13L2 13L2 14L3 14L3 15L4 15L4 16L3 16L3 19L4 19L4 22L5 22L5 23L4 23L4 26L3 26L3 22L2 22L2 24L1 24L1 25L2 25L2 26L3 26L3 28L4 28L4 30L5 30L5 31L4 31L4 32L5 32L5 31L6 31L6 30L8 30L8 29L10 29L10 27L9 27L9 26L12 26L12 27L11 27L11 28L12 28L12 29L11 29L11 30L12 30L12 29L14 29L14 27L17 27L17 28L15 28L15 30L14 30L14 31L13 31L13 32L15 32L15 31L17 31L17 30L19 30L19 31L20 31L20 32L23 32L23 34L27 34L27 33L28 33L28 34L29 34L29 35L28 35L28 36L30 36L30 34L31 34L31 37L30 37L30 38L31 38L31 37L32 37L32 33L28 33L28 32L27 32L27 31L25 31L25 32L24 32L24 31L22 31L22 29L20 29L20 28L21 28L21 27L20 27L20 26L23 26L23 27L22 27L22 28L23 28L23 27L24 27L24 26L25 26L25 29L23 29L23 30L25 30L25 29L26 29L26 27L27 27L27 30L30 30L30 31L29 31L29 32L31 32L31 30L32 30L32 29L34 29L34 28L31 28L31 30L30 30L30 28L29 28L29 25L30 25L30 26L32 26L32 25L33 25L33 26L35 26L35 27L36 27L36 26L35 26L35 25L36 25L36 24L37 24L37 23L36 23L36 22L37 22L37 20L38 20L38 19L37 19L37 18L36 18L36 17L34 17L34 18L32 18L32 17L33 17L33 16L28 16L28 15L27 15L27 17L28 17L28 18L27 18L27 19L29 19L29 18L30 18L30 20L31 20L31 18L32 18L32 19L33 19L33 20L32 20L32 21L28 21L28 20L26 20L26 18L25 18L25 20L26 20L26 21L24 21L24 17L23 17L23 18L22 18L22 16L23 16L23 14L22 14L22 13L20 13L20 9L19 9L19 8L18 8L18 9L17 9L17 10L16 10L16 8L17 8L17 7L18 7L18 6L17 6L17 4ZM26 5L26 7L27 7L27 8L28 8L28 7L29 7L29 9L30 9L30 7L29 7L29 6L28 6L28 5ZM16 6L16 7L17 7L17 6ZM22 6L22 7L21 7L21 8L22 8L22 7L23 7L23 6ZM27 6L27 7L28 7L28 6ZM14 8L14 9L15 9L15 8ZM32 8L32 10L34 10L34 9L33 9L33 8ZM40 8L40 9L41 9L41 8ZM12 9L12 10L13 10L13 9ZM18 9L18 10L19 10L19 9ZM36 9L36 10L37 10L37 9ZM14 10L14 11L13 11L13 12L15 12L15 13L16 13L16 14L15 14L15 15L14 15L14 16L15 16L15 17L14 17L14 18L13 18L13 19L11 19L11 20L10 20L10 19L9 19L9 16L8 16L8 15L7 15L7 14L6 14L6 15L5 15L5 18L4 18L4 19L5 19L5 18L6 18L6 19L7 19L7 20L5 20L5 21L7 21L7 20L8 20L8 19L9 19L9 20L10 20L10 22L9 22L9 23L8 23L8 24L6 24L6 23L7 23L7 22L6 22L6 23L5 23L5 26L4 26L4 27L5 27L5 29L8 29L8 27L7 27L7 26L6 26L6 25L9 25L9 24L10 24L10 25L11 25L11 24L10 24L10 22L11 22L11 23L13 23L13 24L15 24L15 25L14 25L14 26L13 26L13 25L12 25L12 26L13 26L13 27L14 27L14 26L15 26L15 25L16 25L16 26L18 26L18 25L16 25L16 24L17 24L17 22L16 22L16 21L15 21L15 17L18 17L18 18L17 18L17 19L16 19L16 20L19 20L19 21L18 21L18 24L19 24L19 23L20 23L20 25L19 25L19 26L20 26L20 25L21 25L21 24L22 24L22 25L23 25L23 26L24 26L24 25L25 25L25 24L26 24L26 25L27 25L27 27L28 27L28 21L26 21L26 22L25 22L25 23L24 23L24 21L23 21L23 23L22 23L22 20L23 20L23 19L22 19L22 20L20 20L20 19L21 19L21 18L20 18L20 19L19 19L19 16L21 16L21 15L22 15L22 14L21 14L21 15L19 15L19 14L20 14L20 13L19 13L19 11L18 11L18 12L17 12L17 13L16 13L16 12L15 12L15 11L16 11L16 10ZM40 10L40 11L41 11L41 10ZM2 11L2 12L3 12L3 11ZM23 11L23 12L25 12L25 11ZM29 11L29 12L30 12L30 11ZM33 14L33 15L34 15L34 14ZM35 14L35 15L36 15L36 14ZM6 15L6 16L7 16L7 17L6 17L6 18L7 18L7 19L8 19L8 18L7 18L7 17L8 17L8 16L7 16L7 15ZM15 15L15 16L16 16L16 15ZM17 15L17 16L18 16L18 15ZM30 17L30 18L31 18L31 17ZM35 18L35 19L34 19L34 22L33 22L33 21L32 21L32 22L33 22L33 23L32 23L32 24L34 24L34 22L36 22L36 18ZM40 19L40 21L41 21L41 19ZM11 20L11 22L12 22L12 20ZM13 21L13 23L15 23L15 24L16 24L16 22L15 22L15 21ZM19 21L19 22L21 22L21 21ZM26 22L26 24L27 24L27 22ZM30 22L30 25L31 25L31 22ZM23 24L23 25L24 25L24 24ZM40 25L40 28L41 28L41 25ZM6 27L6 28L7 28L7 27ZM18 27L18 28L17 28L17 29L18 29L18 28L20 28L20 27ZM40 29L40 30L41 30L41 29ZM0 30L0 31L1 31L1 30ZM20 30L20 31L21 31L21 30ZM9 31L9 32L12 32L12 31ZM40 31L40 32L41 32L41 31ZM18 33L18 34L20 34L20 33ZM33 33L33 36L36 36L36 33ZM39 33L39 34L41 34L41 33ZM34 34L34 35L35 35L35 34ZM24 35L24 36L25 36L25 35ZM26 35L26 36L27 36L27 35ZM15 37L15 39L16 39L16 40L17 40L17 39L18 39L18 38L17 38L17 37ZM27 37L27 38L29 38L29 37ZM10 38L10 39L11 39L11 40L12 40L12 38ZM39 38L39 39L38 39L38 40L40 40L40 38ZM0 0L0 7L7 7L7 0ZM1 1L1 6L6 6L6 1ZM2 2L2 5L5 5L5 2ZM34 0L34 7L41 7L41 0ZM35 1L35 6L40 6L40 1ZM36 2L36 5L39 5L39 2ZM0 34L0 41L7 41L7 34ZM1 35L1 40L6 40L6 35ZM2 36L2 39L5 39L5 36Z" fill="#000000"/></g></g></svg>\n	1	2025-07-05 05:20:19.666396+00	1	2025-07-05 05:26:17.247462+00	1
\.


--
-- Name: bets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bets_id_seq', 1, true);


--
-- Name: games_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.games_id_seq', 6, true);


--
-- Name: kyc_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kyc_documents_id_seq', 1, false);


--
-- Name: promotions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.promotions_id_seq', 4, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 7, true);


--
-- Name: statuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.statuses_id_seq', 4, true);


--
-- Name: tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tokens_id_seq', 1, false);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transactions_id_seq', 1, true);


--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_activity_logs_id_seq', 4, true);


--
-- Name: user_game_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_game_preferences_id_seq', 1, false);


--
-- Name: user_level_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_level_progress_id_seq', 4, true);


--
-- Name: user_levels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_levels_id_seq', 5, true);


--
-- Name: user_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_profiles_id_seq', 4, true);


--
-- Name: user_promotions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_promotions_id_seq', 1, false);


--
-- Name: user_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_roles_id_seq', 4, true);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_sessions_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: bets bets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_pkey PRIMARY KEY (id);


--
-- Name: games games_game_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_game_code_key UNIQUE (game_code);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: kyc_documents kyc_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_documents
    ADD CONSTRAINT kyc_documents_pkey PRIMARY KEY (id);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: statuses statuses_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_name_key UNIQUE (name);


--
-- Name: statuses statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_pkey PRIMARY KEY (id);


--
-- Name: tokens tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_activity_logs user_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: user_balances user_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_balances
    ADD CONSTRAINT user_balances_pkey PRIMARY KEY (user_id);


--
-- Name: user_game_preferences user_game_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_game_preferences
    ADD CONSTRAINT user_game_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_game_preferences user_game_preferences_user_id_game_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_game_preferences
    ADD CONSTRAINT user_game_preferences_user_id_game_id_key UNIQUE (user_id, game_id);


--
-- Name: user_level_progress user_level_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_level_progress
    ADD CONSTRAINT user_level_progress_pkey PRIMARY KEY (id);


--
-- Name: user_levels user_levels_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_levels
    ADD CONSTRAINT user_levels_name_key UNIQUE (name);


--
-- Name: user_levels user_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_levels
    ADD CONSTRAINT user_levels_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: user_promotions user_promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_promotions
    ADD CONSTRAINT user_promotions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_id_key UNIQUE (session_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_bets_game_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bets_game_id ON public.bets USING btree (game_id);


--
-- Name: idx_bets_outcome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bets_outcome ON public.bets USING btree (outcome);


--
-- Name: idx_bets_placed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bets_placed_at ON public.bets USING btree (placed_at);


--
-- Name: idx_bets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bets_user_id ON public.bets USING btree (user_id);


--
-- Name: idx_games_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_active ON public.games USING btree (is_active);


--
-- Name: idx_games_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_category ON public.games USING btree (category);


--
-- Name: idx_games_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_provider ON public.games USING btree (provider);


--
-- Name: idx_kyc_documents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kyc_documents_status ON public.kyc_documents USING btree (status);


--
-- Name: idx_kyc_documents_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kyc_documents_type ON public.kyc_documents USING btree (document_type);


--
-- Name: idx_kyc_documents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kyc_documents_user_id ON public.kyc_documents USING btree (user_id);


--
-- Name: idx_tokens_access_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tokens_access_token ON public.tokens USING btree (access_token);


--
-- Name: idx_tokens_expired_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tokens_expired_at ON public.tokens USING btree (expired_at);


--
-- Name: idx_tokens_refresh_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_tokens_refresh_token ON public.tokens USING btree (refresh_token);


--
-- Name: idx_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tokens_user_id ON public.tokens USING btree (user_id);


--
-- Name: idx_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at);


--
-- Name: idx_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);


--
-- Name: idx_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);


--
-- Name: idx_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);


--
-- Name: idx_user_activity_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_activity_logs_action ON public.user_activity_logs USING btree (action);


--
-- Name: idx_user_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs USING btree (created_at);


--
-- Name: idx_user_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs USING btree (user_id);


--
-- Name: idx_user_balances_balance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_balances_balance ON public.user_balances USING btree (balance);


--
-- Name: idx_user_game_preferences_favorite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_game_preferences_favorite ON public.user_game_preferences USING btree (is_favorite);


--
-- Name: idx_user_game_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_game_preferences_user_id ON public.user_game_preferences USING btree (user_id);


--
-- Name: idx_user_level_progress_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_level_progress_user_id ON public.user_level_progress USING btree (user_id);


--
-- Name: idx_user_profiles_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_country ON public.user_profiles USING btree (country);


--
-- Name: idx_user_profiles_nationality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_nationality ON public.user_profiles USING btree (nationality);


--
-- Name: idx_user_profiles_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_phone ON public.user_profiles USING btree (phone_number);


--
-- Name: idx_user_profiles_verification_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_verification_level ON public.user_profiles USING btree (verification_level);


--
-- Name: idx_user_promotions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_promotions_status ON public.user_promotions USING btree (status);


--
-- Name: idx_user_promotions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_promotions_user_id ON public.user_promotions USING btree (user_id);


--
-- Name: idx_user_sessions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_active ON public.user_sessions USING btree (is_active);


--
-- Name: idx_user_sessions_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_ip ON public.user_sessions USING btree (ip_address);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: games trg_set_updated_at_games; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_games BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: kyc_documents trg_set_updated_at_kyc_documents; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_kyc_documents BEFORE UPDATE ON public.kyc_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: promotions trg_set_updated_at_promotions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_promotions BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: roles trg_set_updated_at_roles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_roles BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: statuses trg_set_updated_at_statuses; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_statuses BEFORE UPDATE ON public.statuses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tokens trg_set_updated_at_tokens; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_tokens BEFORE UPDATE ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_activity_logs trg_set_updated_at_user_activity_logs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_user_activity_logs BEFORE UPDATE ON public.user_activity_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_balances trg_set_updated_at_user_balances; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_user_balances BEFORE UPDATE ON public.user_balances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_game_preferences trg_set_updated_at_user_game_preferences; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_user_game_preferences BEFORE UPDATE ON public.user_game_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_levels trg_set_updated_at_user_levels; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_user_levels BEFORE UPDATE ON public.user_levels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_profiles trg_set_updated_at_user_profiles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_user_profiles BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_promotions trg_set_updated_at_user_promotions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_user_promotions BEFORE UPDATE ON public.user_promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_roles trg_set_updated_at_user_roles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_user_roles BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_sessions trg_set_updated_at_user_sessions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_user_sessions BEFORE UPDATE ON public.user_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_set_updated_at_users; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bets bets_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id);


--
-- Name: bets bets_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id);


--
-- Name: bets bets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: kyc_documents kyc_documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_documents
    ADD CONSTRAINT kyc_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_activity_logs user_activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_balances user_balances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_balances
    ADD CONSTRAINT user_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_game_preferences user_game_preferences_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_game_preferences
    ADD CONSTRAINT user_game_preferences_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id);


--
-- Name: user_game_preferences user_game_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_game_preferences
    ADD CONSTRAINT user_game_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_level_progress user_level_progress_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_level_progress
    ADD CONSTRAINT user_level_progress_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.user_levels(id);


--
-- Name: user_level_progress user_level_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_level_progress
    ADD CONSTRAINT user_level_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_promotions user_promotions_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_promotions
    ADD CONSTRAINT user_promotions_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id);


--
-- Name: user_promotions user_promotions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_promotions
    ADD CONSTRAINT user_promotions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.statuses(id);


--
-- PostgreSQL database dump complete
--

