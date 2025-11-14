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
-- Name: calculate_user_balance(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_user_balance(p_user_id integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    net_balance NUMERIC := 0;
    locked_amount NUMERIC := 0;
BEGIN
    -- Calculate net balance from transactions
    SELECT COALESCE(SUM(
        CASE 
            WHEN type IN ('deposit', 'win', 'bonus', 'cashback', 'refund', 'adjustment') THEN amount
            WHEN type IN ('withdrawal', 'bet') THEN -amount
            ELSE 0
        END
    ), 0) INTO net_balance
    FROM transactions 
    WHERE user_id = p_user_id AND status = 'completed';
    
    -- Calculate locked amount from pending bets
    SELECT COALESCE(SUM(bet_amount), 0) INTO locked_amount
    FROM bets 
    WHERE user_id = p_user_id AND outcome = 'pending';
    
    -- Return available balance (net balance minus locked amount)
    RETURN GREATEST(0, net_balance - locked_amount);
END;
$$;


ALTER FUNCTION public.calculate_user_balance(p_user_id integer) OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: set_updated_at_game_provider_configs(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at_game_provider_configs() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at_game_provider_configs() OWNER TO postgres;

--
-- Name: sync_user_balance(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_user_balance(p_user_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    real_time_balance NUMERIC;
    bonus_balance NUMERIC;
    total_deposited NUMERIC;
    total_withdrawn NUMERIC;
    total_wagered NUMERIC;
    total_won NUMERIC;
    user_currency VARCHAR(3);
BEGIN
    -- Get real-time balance
    SELECT calculate_user_balance(p_user_id) INTO real_time_balance;
    
    -- Get bonus balance from stored record
    SELECT COALESCE(ub.bonus_balance, 0) INTO bonus_balance
    FROM user_balances ub WHERE ub.user_id = p_user_id;
    
    -- Calculate totals from transactions
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'bet' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END), 0)
    INTO total_deposited, total_withdrawn, total_wagered, total_won
    FROM transactions 
    WHERE user_id = p_user_id AND status = 'completed';
    
    -- Get user currency
    SELECT COALESCE(currency, 'USD') INTO user_currency
    FROM user_profiles WHERE user_id = p_user_id;
    
    -- Update stored balance
    INSERT INTO user_balances (user_id, balance, bonus_balance, locked_balance, total_deposited, total_withdrawn, total_wagered, total_won, updated_at)
    VALUES (p_user_id, real_time_balance, bonus_balance, 0, total_deposited, total_withdrawn, total_wagered, total_won, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
        balance = EXCLUDED.balance,
        total_deposited = EXCLUDED.total_deposited,
        total_withdrawn = EXCLUDED.total_withdrawn,
        total_wagered = EXCLUDED.total_wagered,
        total_won = EXCLUDED.total_won,
        updated_at = CURRENT_TIMESTAMP;
END;
$$;


ALTER FUNCTION public.sync_user_balance(p_user_id integer) OWNER TO postgres;

--
-- Name: trigger_sync_balance(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_sync_balance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Sync balance for the affected user
    PERFORM sync_user_balance(COALESCE(NEW.user_id, OLD.user_id));
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.trigger_sync_balance() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bets; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT bets_outcome_check CHECK (((outcome)::text = ANY (ARRAY[('win'::character varying)::text, ('lose'::character varying)::text, ('pending'::character varying)::text, ('cancelled'::character varying)::text])))
);


ALTER TABLE public.bets OWNER TO postgres;

--
-- Name: bets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bets_id_seq OWNER TO postgres;

--
-- Name: bets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bets_id_seq OWNED BY public.bets.id;


--
-- Name: captcha; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.captcha (
    id character varying(100) NOT NULL,
    text character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.captcha OWNER TO postgres;

--
-- Name: daily_user_bet_summary; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.daily_user_bet_summary OWNER TO postgres;

--
-- Name: default_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.default_templates (
    id integer NOT NULL,
    user_level_id integer,
    template_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.default_templates OWNER TO postgres;

--
-- Name: default_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.default_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.default_templates_id_seq OWNER TO postgres;

--
-- Name: default_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.default_templates_id_seq OWNED BY public.default_templates.id;


--
-- Name: game_provider_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_provider_configs (
    id integer NOT NULL,
    provider_name character varying(100) NOT NULL,
    api_key character varying(255) NOT NULL,
    api_secret character varying(255) NOT NULL,
    base_url text NOT NULL,
    is_active boolean DEFAULT true,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.game_provider_configs OWNER TO postgres;

--
-- Name: game_provider_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.game_provider_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.game_provider_configs_id_seq OWNER TO postgres;

--
-- Name: game_provider_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.game_provider_configs_id_seq OWNED BY public.game_provider_configs.id;


--
-- Name: games; Type: TABLE; Schema: public; Owner: postgres
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
    vendor character varying(50) NOT NULL,
    CONSTRAINT games_volatility_check CHECK (((volatility)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text])))
);


ALTER TABLE public.games OWNER TO postgres;

--
-- Name: COLUMN games.vendor; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.games.vendor IS 'Vendor identifier (usually lowercase provider name)';


--
-- Name: games_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.games_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.games_id_seq OWNER TO postgres;

--
-- Name: games_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.games_id_seq OWNED BY public.games.id;


--
-- Name: ggr_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ggr_audit_log (
    id integer NOT NULL,
    real_ggr numeric(20,2) NOT NULL,
    reported_ggr numeric(20,2) NOT NULL,
    filter_percent double precision NOT NULL,
    tolerance double precision NOT NULL,
    report_data jsonb,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ggr_audit_log OWNER TO postgres;

--
-- Name: ggr_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ggr_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ggr_audit_log_id_seq OWNER TO postgres;

--
-- Name: ggr_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ggr_audit_log_id_seq OWNED BY public.ggr_audit_log.id;


--
-- Name: ggr_filter_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ggr_filter_settings (
    id integer NOT NULL,
    filter_percent double precision DEFAULT 0.5 NOT NULL,
    tolerance double precision DEFAULT 0.05 NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ggr_filter_settings OWNER TO postgres;

--
-- Name: ggr_filter_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ggr_filter_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ggr_filter_settings_id_seq OWNER TO postgres;

--
-- Name: ggr_filter_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ggr_filter_settings_id_seq OWNED BY public.ggr_filter_settings.id;


--
-- Name: kyc_documents; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT kyc_documents_document_type_check CHECK (((document_type)::text = ANY (ARRAY[('passport'::character varying)::text, ('national_id'::character varying)::text, ('drivers_license'::character varying)::text, ('utility_bill'::character varying)::text, ('bank_statement'::character varying)::text]))),
    CONSTRAINT kyc_documents_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text])))
);


ALTER TABLE public.kyc_documents OWNER TO postgres;

--
-- Name: kyc_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kyc_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kyc_documents_id_seq OWNER TO postgres;

--
-- Name: kyc_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kyc_documents_id_seq OWNED BY public.kyc_documents.id;


--
-- Name: modules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modules (
    id integer NOT NULL,
    title text NOT NULL,
    subtitle text NOT NULL,
    path text,
    icons text,
    newtab boolean NOT NULL,
    "parentId" smallint,
    "menuName" text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.modules OWNER TO postgres;

--
-- Name: moduals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.moduals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.moduals_id_seq OWNER TO postgres;

--
-- Name: moduals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.moduals_id_seq OWNED BY public.modules.id;


--
-- Name: payment_gateways; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_gateways (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    logo_url character varying(500),
    website_url character varying(500),
    api_key character varying(255),
    api_secret character varying(255),
    api_endpoint character varying(500),
    webhook_url character varying(500),
    webhook_secret character varying(255),
    supported_currencies text[],
    supported_countries text[],
    min_amount numeric(10,2),
    max_amount numeric(10,2),
    processing_time character varying(50),
    fees_percentage numeric(5,2),
    fees_fixed numeric(10,2),
    auto_approval boolean DEFAULT false,
    requires_kyc boolean DEFAULT false,
    is_active boolean DEFAULT true,
    config jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payment_gateways OWNER TO postgres;

--
-- Name: payment_gateways_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_gateways_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_gateways_id_seq OWNER TO postgres;

--
-- Name: payment_gateways_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_gateways_id_seq OWNED BY public.payment_gateways.id;


--
-- Name: promotions; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT promotions_type_check CHECK (((type)::text = ANY (ARRAY[('welcome_bonus'::character varying)::text, ('deposit_bonus'::character varying)::text, ('free_spins'::character varying)::text, ('cashback'::character varying)::text, ('reload_bonus'::character varying)::text, ('tournament'::character varying)::text])))
);


ALTER TABLE public.promotions OWNER TO postgres;

--
-- Name: promotions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.promotions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.promotions_id_seq OWNER TO postgres;

--
-- Name: promotions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.promotions_id_seq OWNED BY public.promotions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: rtp_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rtp_settings (
    id integer NOT NULL,
    target_profit_percent numeric(5,2) DEFAULT 20.00 NOT NULL,
    effective_rtp numeric(5,2) DEFAULT 80.00 NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.rtp_settings OWNER TO postgres;

--
-- Name: rtp_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rtp_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rtp_settings_id_seq OWNER TO postgres;

--
-- Name: rtp_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rtp_settings_id_seq OWNED BY public.rtp_settings.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value text NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: statuses; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.statuses OWNER TO postgres;

--
-- Name: statuses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.statuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.statuses_id_seq OWNER TO postgres;

--
-- Name: statuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.statuses_id_seq OWNED BY public.statuses.id;


--
-- Name: template_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_configs (
    id integer NOT NULL,
    template_id integer,
    config_key character varying(100) NOT NULL,
    config_value jsonb NOT NULL,
    config_type character varying(20) DEFAULT 'string'::character varying,
    is_required boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.template_configs OWNER TO postgres;

--
-- Name: template_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.template_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.template_configs_id_seq OWNER TO postgres;

--
-- Name: template_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.template_configs_id_seq OWNED BY public.template_configs.id;


--
-- Name: template_features; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_features (
    id integer NOT NULL,
    template_id integer,
    feature_name character varying(100) NOT NULL,
    feature_key character varying(100) NOT NULL,
    feature_type character varying(50) NOT NULL,
    feature_config jsonb NOT NULL,
    is_enabled boolean DEFAULT true,
    is_premium boolean DEFAULT false,
    price numeric(10,2) DEFAULT 0.00,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.template_features OWNER TO postgres;

--
-- Name: template_features_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.template_features_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.template_features_id_seq OWNER TO postgres;

--
-- Name: template_features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.template_features_id_seq OWNED BY public.template_features.id;


--
-- Name: templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.templates (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    type character varying(20) NOT NULL,
    category character varying(50) DEFAULT 'default'::character varying,
    version character varying(20) DEFAULT '1.0.0'::character varying,
    author character varying(100),
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    is_premium boolean DEFAULT false,
    price numeric(10,2) DEFAULT 0.00,
    currency character varying(3) DEFAULT 'USD'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT templates_type_check CHECK (((type)::text = ANY (ARRAY[('admin'::character varying)::text, ('user'::character varying)::text, ('premium'::character varying)::text])))
);


ALTER TABLE public.templates OWNER TO postgres;

--
-- Name: templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.templates_id_seq OWNER TO postgres;

--
-- Name: templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.templates_id_seq OWNED BY public.templates.id;


--
-- Name: tokens; Type: TABLE; Schema: public; Owner: postgres
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
    updated_by integer DEFAULT 1,
    game_id integer,
    category character varying(100)
);


ALTER TABLE public.tokens OWNER TO postgres;

--
-- Name: tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tokens_id_seq OWNER TO postgres;

--
-- Name: tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tokens_id_seq OWNED BY public.tokens.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT transactions_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text, ('cancelled'::character varying)::text]))),
    CONSTRAINT transactions_type_check CHECK (((type)::text = ANY (ARRAY[('deposit'::character varying)::text, ('withdrawal'::character varying)::text, ('bet'::character varying)::text, ('win'::character varying)::text, ('bonus'::character varying)::text, ('cashback'::character varying)::text, ('refund'::character varying)::text, ('adjustment'::character varying)::text])))
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: transaction_summary_by_type; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.transaction_summary_by_type AS
 SELECT user_id,
    type,
    count(*) AS count,
    sum(amount) AS total_amount,
    avg(amount) AS avg_amount
   FROM public.transactions
  GROUP BY user_id, type;


ALTER VIEW public.transaction_summary_by_type OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: user_activity_logs; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_activity_logs OWNER TO postgres;

--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_activity_logs_id_seq OWNER TO postgres;

--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_activity_logs_id_seq OWNED BY public.user_activity_logs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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
    updated_by integer DEFAULT 1,
    is_2fa_enabled boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: user_activity_summary; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.user_activity_summary OWNER TO postgres;

--
-- Name: user_balances; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_balances OWNER TO postgres;

--
-- Name: user_category_balances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_category_balances (
    user_id integer NOT NULL,
    category character varying(100) NOT NULL,
    balance numeric(18,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.user_category_balances OWNER TO postgres;

--
-- Name: user_game_preferences; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_game_preferences OWNER TO postgres;

--
-- Name: user_favorite_games; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.user_favorite_games OWNER TO postgres;

--
-- Name: user_financial_summary; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.user_financial_summary OWNER TO postgres;

--
-- Name: user_game_bets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_game_bets (
    user_id integer NOT NULL,
    game_id integer NOT NULL,
    total_bet numeric(18,2) DEFAULT 0 NOT NULL,
    total_win numeric(18,2) DEFAULT 0 NOT NULL,
    total_loss numeric(18,2) DEFAULT 0 NOT NULL,
    last_bet_at timestamp without time zone,
    last_result_at timestamp without time zone
);


ALTER TABLE public.user_game_bets OWNER TO postgres;

--
-- Name: user_game_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_game_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_game_preferences_id_seq OWNER TO postgres;

--
-- Name: user_game_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_game_preferences_id_seq OWNED BY public.user_game_preferences.id;


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT user_profiles_gender_check CHECK (((gender)::text = ANY (ARRAY[('male'::character varying)::text, ('female'::character varying)::text, ('other'::character varying)::text])))
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- Name: user_gaming_analytics; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.user_gaming_analytics OWNER TO postgres;

--
-- Name: user_kyc_status; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.user_kyc_status OWNER TO postgres;

--
-- Name: user_level_progress; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_level_progress OWNER TO postgres;

--
-- Name: user_level_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_level_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_level_progress_id_seq OWNER TO postgres;

--
-- Name: user_level_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_level_progress_id_seq OWNED BY public.user_level_progress.id;


--
-- Name: user_levels; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_levels OWNER TO postgres;

--
-- Name: user_level_progress_view; Type: VIEW; Schema: public; Owner: postgres
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


ALTER VIEW public.user_level_progress_view OWNER TO postgres;

--
-- Name: user_levels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_levels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_levels_id_seq OWNER TO postgres;

--
-- Name: user_levels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_levels_id_seq OWNED BY public.user_levels.id;


--
-- Name: user_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_profiles_id_seq OWNER TO postgres;

--
-- Name: user_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_profiles_id_seq OWNED BY public.user_profiles.id;


--
-- Name: user_promotions; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT user_promotions_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('completed'::character varying)::text, ('expired'::character varying)::text, ('cancelled'::character varying)::text])))
);


ALTER TABLE public.user_promotions OWNER TO postgres;

--
-- Name: user_promotions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_promotions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_promotions_id_seq OWNER TO postgres;

--
-- Name: user_promotions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_promotions_id_seq OWNED BY public.user_promotions.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO postgres;

--
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_sessions_id_seq OWNER TO postgres;

--
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- Name: user_template_features; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_template_features (
    id integer NOT NULL,
    user_id integer,
    template_id integer,
    feature_id integer,
    is_enabled boolean DEFAULT true,
    custom_config jsonb DEFAULT '{}'::jsonb,
    purchased_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_template_features OWNER TO postgres;

--
-- Name: user_template_features_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_template_features_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_template_features_id_seq OWNER TO postgres;

--
-- Name: user_template_features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_template_features_id_seq OWNED BY public.user_template_features.id;


--
-- Name: user_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_templates (
    id integer NOT NULL,
    user_id integer,
    template_id integer,
    is_active boolean DEFAULT true,
    custom_config jsonb DEFAULT '{}'::jsonb,
    activated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_templates OWNER TO postgres;

--
-- Name: user_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_templates_id_seq OWNER TO postgres;

--
-- Name: user_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_templates_id_seq OWNED BY public.user_templates.id;


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: bets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bets ALTER COLUMN id SET DEFAULT nextval('public.bets_id_seq'::regclass);


--
-- Name: default_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.default_templates ALTER COLUMN id SET DEFAULT nextval('public.default_templates_id_seq'::regclass);


--
-- Name: game_provider_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_provider_configs ALTER COLUMN id SET DEFAULT nextval('public.game_provider_configs_id_seq'::regclass);


--
-- Name: games id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games ALTER COLUMN id SET DEFAULT nextval('public.games_id_seq'::regclass);


--
-- Name: ggr_audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ggr_audit_log ALTER COLUMN id SET DEFAULT nextval('public.ggr_audit_log_id_seq'::regclass);


--
-- Name: ggr_filter_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ggr_filter_settings ALTER COLUMN id SET DEFAULT nextval('public.ggr_filter_settings_id_seq'::regclass);


--
-- Name: kyc_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kyc_documents ALTER COLUMN id SET DEFAULT nextval('public.kyc_documents_id_seq'::regclass);


--
-- Name: modules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules ALTER COLUMN id SET DEFAULT nextval('public.moduals_id_seq'::regclass);


--
-- Name: payment_gateways id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_gateways ALTER COLUMN id SET DEFAULT nextval('public.payment_gateways_id_seq'::regclass);


--
-- Name: promotions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotions ALTER COLUMN id SET DEFAULT nextval('public.promotions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: rtp_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rtp_settings ALTER COLUMN id SET DEFAULT nextval('public.rtp_settings_id_seq'::regclass);


--
-- Name: statuses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statuses ALTER COLUMN id SET DEFAULT nextval('public.statuses_id_seq'::regclass);


--
-- Name: template_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_configs ALTER COLUMN id SET DEFAULT nextval('public.template_configs_id_seq'::regclass);


--
-- Name: template_features id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_features ALTER COLUMN id SET DEFAULT nextval('public.template_features_id_seq'::regclass);


--
-- Name: templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates ALTER COLUMN id SET DEFAULT nextval('public.templates_id_seq'::regclass);


--
-- Name: tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tokens ALTER COLUMN id SET DEFAULT nextval('public.tokens_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: user_activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activity_logs ALTER COLUMN id SET DEFAULT nextval('public.user_activity_logs_id_seq'::regclass);


--
-- Name: user_game_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_game_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_game_preferences_id_seq'::regclass);


--
-- Name: user_level_progress id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_level_progress ALTER COLUMN id SET DEFAULT nextval('public.user_level_progress_id_seq'::regclass);


--
-- Name: user_levels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_levels ALTER COLUMN id SET DEFAULT nextval('public.user_levels_id_seq'::regclass);


--
-- Name: user_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles ALTER COLUMN id SET DEFAULT nextval('public.user_profiles_id_seq'::regclass);


--
-- Name: user_promotions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_promotions ALTER COLUMN id SET DEFAULT nextval('public.user_promotions_id_seq'::regclass);


--
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: user_template_features id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_template_features ALTER COLUMN id SET DEFAULT nextval('public.user_template_features_id_seq'::regclass);


--
-- Name: user_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_templates ALTER COLUMN id SET DEFAULT nextval('public.user_templates_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: bets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bets (id, user_id, game_id, transaction_id, bet_amount, win_amount, multiplier, outcome, game_data, placed_at, result_at, session_id, created_at, created_by) FROM stdin;
2	1	53	53	100.00	0.00	\N	pending	{"bets": [{"chips": 100, "number": 17, "bet_type": "straight"}], "session_id": "roul-20250714-323"}	2025-07-14 13:00:35.725371+00	\N	\N	2025-07-14 13:00:35.725371+00	1
3	1	53	54	100.00	0.00	\N	pending	{"bets": [{"chips": 100, "number": 17, "bet_type": "straight"}], "session_id": "roul-20250714-480"}	2025-07-14 13:53:42.912461+00	\N	\N	2025-07-14 13:53:42.912461+00	1
4	1	53	55	100.00	0.00	\N	pending	{"bets": [{"chips": 100, "number": 17, "bet_type": "straight"}], "session_id": "roul-20250714-317"}	2025-07-14 14:15:29.67014+00	\N	\N	2025-07-14 14:15:29.67014+00	1
\.


--
-- Data for Name: captcha; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.captcha (id, text, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: default_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.default_templates (id, user_level_id, template_id, is_active, created_at) FROM stdin;
1	1	2	t	2025-07-10 12:21:51.264399+00
2	2	2	t	2025-07-10 12:21:51.264399+00
3	3	2	t	2025-07-10 12:21:51.264399+00
4	4	2	t	2025-07-10 12:21:51.264399+00
5	5	2	t	2025-07-10 12:21:51.264399+00
\.


--
-- Data for Name: game_provider_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.game_provider_configs (id, provider_name, api_key, api_secret, base_url, is_active, metadata, created_at, updated_at) FROM stdin;
1	thinkcode_stg	thinkcode_stg	2xk3SrX09oQ71Z3F	https://staging-wallet.semper7.net/api/generic/games/list/all	t	{"launch_host": "https://staging-wallet-launch1.semper7.net", "callback_url": "http://54.169.105.223/api/innova/"}	2025-07-07 12:52:17.297202+00	2025-07-07 12:52:17.297202+00
\.


--
-- Data for Name: games; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.games (id, name, provider, category, subcategory, image_url, thumbnail_url, game_code, rtp_percentage, volatility, min_bet, max_bet, max_win, is_featured, is_new, is_hot, is_active, created_at, created_by, updated_at, updated_by, vendor) FROM stdin;
40	Caesars Glory	iconix	slots	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/3.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/3.png	3	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.028985+00	1	2025-07-07 15:33:45.028985+00	1	iconix
41	Cyber Ninja	iconix	slots	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/4.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/4.png	4	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.031007+00	1	2025-07-07 15:33:45.031007+00	1	iconix
42	Kleopatra	iconix	slots	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/11.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/11.png	11	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.033292+00	1	2025-07-07 15:33:45.033292+00	1	iconix
43	Monsters House	iconix	slots	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/13.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/13.png	13	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.035414+00	1	2025-07-07 15:33:45.035414+00	1	iconix
45	Sakura	iconix	slots	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/18.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/18.png	18	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.040203+00	1	2025-07-07 15:33:45.040203+00	1	iconix
46	The Dragon	iconix	slots	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/22.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/22.png	22	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.042394+00	1	2025-07-07 15:33:45.042394+00	1	iconix
47	Venice Carnival	iconix	slots	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/27.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/27.png	27	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.044407+00	1	2025-07-07 15:33:45.044407+00	1	iconix
48	Zombie Escape	iconix	slots	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/29.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/29.png	29	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.046466+00	1	2025-07-07 15:33:45.046466+00	1	iconix
49	Dojo	iconix	slots	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/30.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/30.png	30	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.048586+00	1	2025-07-07 15:33:45.048586+00	1	iconix
50	Legend Of Emerald	iconix	slots	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/34.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/34.png	34	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.050288+00	1	2025-07-07 15:33:45.050288+00	1	iconix
52	Kunoichi	iconix	slots	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/42.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/42.png	42	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.056857+00	1	2025-07-07 15:33:45.056857+00	1	iconix
54	VIP American Roulette	iconix	tablegame	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/47.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/47.png	47	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.060795+00	1	2025-07-07 15:33:45.060795+00	1	iconix
55	VIP French Roulette	iconix	tablegame	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/48.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/48.png	48	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.064114+00	1	2025-07-07 15:33:45.064114+00	1	iconix
57	Pro Roulette	iconix	tablegame	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/50.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/50.png	50	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.068422+00	1	2025-07-07 15:33:45.068422+00	1	iconix
58	European Roulette	iconix	tablegame	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/51.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/51.png	51	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.070139+00	1	2025-07-07 15:33:45.070139+00	1	iconix
59	Rocketman	iconix	crashgame	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/256.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/256.png	256	\N	\N	\N	\N	\N	f	f	f	t	2025-07-07 15:33:45.072926+00	1	2025-07-07 15:33:45.072926+00	1	iconix
53	American Roulette	iconix	tablegame	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/46.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/46.png	46	\N	\N	1.00	1000.00	\N	f	f	f	t	2025-07-07 15:33:45.058837+00	1	2025-07-13 05:24:49.351638+00	1	iconix
56	Immersive Roulette	iconix	tablegame	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/49.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/49.png	49	\N	\N	\N	\N	\N	f	f	t	t	2025-07-07 15:33:45.066498+00	1	2025-07-13 07:06:39.403893+00	1	iconix
51	Horror Circus	iconix	slots	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/40.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/40.png	40	\N	\N	\N	\N	\N	f	f	t	t	2025-07-07 15:33:45.054573+00	1	2025-07-13 07:06:39.403893+00	1	iconix
44	Naga King	iconix	slots	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/15.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/15.png	15	\N	\N	\N	\N	\N	f	f	t	t	2025-07-07 15:33:45.037985+00	1	2025-07-13 07:06:39.403893+00	1	iconix
39	Aztec Temple	iconix	slots	\N	https://media.oiuyoiuyjjjy.com/2/iconix/440x590/2.png	https://media.oiuyoiuyjjjy.com/2/iconix/300x300/2.png	2	\N	\N	\N	\N	\N	f	f	t	t	2025-07-07 15:33:45.021846+00	1	2025-07-13 07:06:39.403893+00	1	iconix
4	Provider Game 4	ProviderName	slots	\N	\N	\N	game_code_4	\N	\N	\N	\N	\N	f	f	f	t	2025-07-22 12:21:52.960995+00	1	2025-07-22 12:21:52.960995+00	1	providername
\.


--
-- Data for Name: ggr_audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ggr_audit_log (id, real_ggr, reported_ggr, filter_percent, tolerance, report_data, "timestamp") FROM stdin;
\.


--
-- Data for Name: ggr_filter_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ggr_filter_settings (id, filter_percent, tolerance, updated_at) FROM stdin;
1	0.5	0.05	2025-07-13 04:50:54.392122+00
\.


--
-- Data for Name: kyc_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kyc_documents (id, user_id, document_type, document_number, document_url, front_image_url, back_image_url, selfie_image_url, status, rejection_reason, verified_at, verified_by, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: modules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.modules (id, title, subtitle, path, icons, newtab, "parentId", "menuName", created_at, updated_at) FROM stdin;
22	All lotteries	Alllotteries	alllotteries	SparklesIcon	f	21	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
23	Picks for you	Picksforyou	picksforyou	SparklesIcon	f	21	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
24	Popular	Popular	popular	SparklesIcon	f	21	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
25	BC Lottery	BCLottery	bclottery	SparklesIcon	f	21	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
26	Favorites	Favorites	favorites	SparklesIcon	f	21	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
27	My bets	Mybets	mybets	SparklesIcon	f	21	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
2	Top Picks	TopPicks	toppicks	SparklesIcon	f	1	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
1	Casino	Casino	\N	BarsArrowDownIcon	f	\N	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
3	Hot Game	HotGame	hots	SparklesIcon	f	1	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
4	Feature Games	Feature	feature	SparklesIcon	f	1	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
5	New Releases	NewReleases	new	SparklesIcon	f	1	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
6	Live Casino	LiveCasino	livecasino	SparklesIcon	f	1	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
7	Table Games	TableGames	tablegames	SparklesIcon	f	1	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
8	Slots	Slots	slots	SparklesIcon	f	1	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
9	Bingo	Bingo	bingo	SparklesIcon	f	1	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
10	Sports	Sports	\N	BarsArrowDownIcon	f	\N	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
11	Soccer	Soccer	soccer	SparklesIcon	f	10	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
12	Tennis	Tennis	tennis	SparklesIcon	f	10	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
13	Basketball	Basketball	basketball	SparklesIcon	f	10	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
14	Cricket	Cricket	cricket	SparklesIcon	f	10	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
15	FIFA	FIFA	fifa	SparklesIcon	f	10	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
16	American Football	AmericanFootball	soccer	SparklesIcon	f	10	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
17	Ice_Hockey	IceHockey	icehockey	SparklesIcon	f	10	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
18	Baseball	Baseball	baseball	SparklesIcon	f	10	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
19	Handball	Handball	handball	SparklesIcon	f	10	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
20	Racing	Racing	racing	SparklesIcon	f	10	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
21	Lottery	Lottery		BarsArrowDownIcon	f	\N	sidebar	2025-07-22 12:30:46.072971+00	2025-07-22 12:31:30.096854+00
\.


--
-- Data for Name: payment_gateways; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_gateways (id, name, code, type, description, logo_url, website_url, api_key, api_secret, api_endpoint, webhook_url, webhook_secret, supported_currencies, supported_countries, min_amount, max_amount, processing_time, fees_percentage, fees_fixed, auto_approval, requires_kyc, is_active, config, created_at, updated_at) FROM stdin;
1	Stripe	stripe	card	Credit/Debit card payments	https://example.com/stripe-logo.png	https://stripe.com	\N	\N	\N	\N	\N	{USD,EUR,GBP}	{US,CA,GB}	5.00	10000.00	instant	2.90	0.30	t	f	t	\N	2025-07-05 11:54:29.496499+00	2025-07-05 11:54:29.496499+00
2	PayPal	paypal	digital_wallet	PayPal digital wallet	https://example.com/paypal-logo.png	https://paypal.com	\N	\N	\N	\N	\N	{USD,EUR,GBP}	{US,CA,GB}	1.00	5000.00	instant	3.50	0.35	t	f	t	\N	2025-07-05 11:54:29.496499+00	2025-07-05 11:54:29.496499+00
3	Bank Transfer	bank_transfer	bank	Direct bank transfer	https://example.com/bank-logo.png	https://bank.com	\N	\N	\N	\N	\N	{USD,EUR}	{US,CA}	50.00	50000.00	1-3 days	0.00	5.00	f	t	t	\N	2025-07-05 11:54:29.496499+00	2025-07-05 11:54:29.496499+00
7	Oxapay	oxapay	both	Crypto payment gateway supporting multiple digital assets	https://example.com/oxapay-logo.png	https://oxapay.com	oxa_test_api_key_123456	oxa_test_api_secret_abcdef	https://api.oxapay.com/v1	https://yourdomain.com/webhooks/oxapay	whsec_oxapay_7890xyz	{BTC,ETH,USDT,TRX,LTC}	{ALL}	5.00	50000.00	Instant to 10 minutes	1.00	0.00	t	f	t	{"network": "TRC20", "sandbox_mode": true, "invoice_lifetime": 900, "callback_confirmations": 1}	2025-07-09 13:15:55.018261+00	2025-07-09 13:15:55.018261+00
\.


--
-- Data for Name: promotions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotions (id, name, description, type, bonus_percentage, max_bonus_amount, min_deposit_amount, wagering_requirement, free_spins_count, start_date, end_date, is_active, created_at, created_by, updated_at, updated_by) FROM stdin;
1	Welcome Bonus	Get 100% bonus on your first deposit	welcome_bonus	100.00	500.00	20.00	35.00	50	2025-07-03 00:00:00+00	2026-07-03 00:00:00+00	t	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
2	Reload Bonus	Get 50% bonus on your deposit	reload_bonus	50.00	200.00	10.00	25.00	25	2025-07-03 00:00:00+00	2026-07-03 00:00:00+00	t	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
3	Free Spins Friday	Get 100 free spins every Friday	free_spins	\N	\N	50.00	20.00	100	2025-07-03 00:00:00+00	2026-07-03 00:00:00+00	t	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
4	Cashback Weekend	Get 10% cashback on weekend losses	cashback	10.00	100.00	\N	\N	\N	2025-07-03 00:00:00+00	2026-07-03 00:00:00+00	t	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, created_at, created_by, updated_at, updated_by) FROM stdin;
1	Admin	Full access to the system	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
2	Player	End-user or customer	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
3	Support	Support team member	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
4	Accountant	Handles finances and reports	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
5	Developer	Developer or technical team	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
6	Manager	Casino manager	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
7	Moderator	Content and user moderator	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
8	Influencer	Influencer Marketing	2025-07-04 08:04:22.953478+00	1	2025-07-04 08:04:22.953478+00	1
9	Affiliates	Affiliates Marketing	2025-07-04 08:04:22.953478+00	1	2025-07-04 08:04:22.953478+00	1
\.


--
-- Data for Name: rtp_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rtp_settings (id, target_profit_percent, effective_rtp, updated_at) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (key, value) FROM stdin;
maintenance	false
\.


--
-- Data for Name: statuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.statuses (id, name, description, created_at, created_by, updated_at, updated_by) FROM stdin;
1	Active	Can log in and use the system	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
2	Inactive	Disabled or deleted user	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
3	Suspended	Temporarily suspended	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
4	Banned	Permanently banned	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
\.


--
-- Data for Name: template_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_configs (id, template_id, config_key, config_value, config_type, is_required, created_at) FROM stdin;
1	1	primary_color	"#3B82F6"	string	t	2025-07-10 12:21:51.264399+00
2	1	secondary_color	"#6B7280"	string	t	2025-07-10 12:21:51.264399+00
3	1	sidebar_width	280	number	f	2025-07-10 12:21:51.264399+00
4	1	show_analytics	true	boolean	f	2025-07-10 12:21:51.264399+00
5	1	enable_dark_mode	true	boolean	f	2025-07-10 12:21:51.264399+00
6	1	refresh_interval	30000	number	f	2025-07-10 12:21:51.264399+00
7	2	primary_color	"#10B981"	string	t	2025-07-10 12:21:51.264399+00
8	2	secondary_color	"#F59E0B"	string	t	2025-07-10 12:21:51.264399+00
9	2	game_grid_columns	4	number	f	2025-07-10 12:21:51.264399+00
10	2	show_game_animations	true	boolean	f	2025-07-10 12:21:51.264399+00
11	2	enable_sound_effects	true	boolean	f	2025-07-10 12:21:51.264399+00
12	2	auto_refresh_balance	true	boolean	f	2025-07-10 12:21:51.264399+00
13	3	primary_color	"#6366F1"	string	t	2025-07-10 12:21:51.264399+00
14	3	secondary_color	"#8B5CF6"	string	t	2025-07-10 12:21:51.264399+00
15	3	background_color	"#1F2937"	string	t	2025-07-10 12:21:51.264399+00
16	3	surface_color	"#374151"	string	t	2025-07-10 12:21:51.264399+00
17	3	text_primary	"#F9FAFB"	string	t	2025-07-10 12:21:51.264399+00
18	3	text_secondary	"#D1D5DB"	string	t	2025-07-10 12:21:51.264399+00
\.


--
-- Data for Name: template_features; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.template_features (id, template_id, feature_name, feature_key, feature_type, feature_config, is_enabled, is_premium, price, sort_order, created_at) FROM stdin;
1	1	Advanced Analytics Dashboard	analytics_dashboard	widget	{"charts": ["revenue", "users", "games"], "widget_type": "analytics", "refresh_interval": 30000}	t	f	0.00	1	2025-07-10 12:21:51.264399+00
2	1	User Management Panel	user_management	widget	{"widget_type": "user_management", "show_actions": true, "bulk_operations": true}	t	f	0.00	2	2025-07-10 12:21:51.264399+00
3	1	Real-time Notifications	real_time_notifications	widget	{"position": "top-right", "widget_type": "notifications", "sound_enabled": true}	t	f	0.00	3	2025-07-10 12:21:51.264399+00
4	1	Dark Mode Toggle	dark_mode	layout	{"theme": "dark", "auto_switch": false, "persist_preference": true}	t	f	0.00	4	2025-07-10 12:21:51.264399+00
5	1	Custom Navigation Menu	custom_nav	navigation	{"menu_items": [{"url": "/dashboard", "icon": "home", "label": "Dashboard"}, {"url": "/users", "icon": "users", "label": "Users"}, {"url": "/games", "icon": "gamepad", "label": "Games"}, {"url": "/analytics", "icon": "chart", "label": "Analytics"}]}	t	f	0.00	5	2025-07-10 12:21:51.264399+00
6	2	Game Grid Layout	game_grid	layout	{"show_search": true, "grid_columns": 4, "show_filters": true, "show_categories": true}	t	f	0.00	1	2025-07-10 12:21:51.264399+00
7	2	Favorite Games Widget	favorite_games	widget	{"max_items": 10, "widget_type": "favorites", "show_quick_play": true}	t	f	0.00	2	2025-07-10 12:21:51.264399+00
8	2	Recent Games History	recent_games	widget	{"max_items": 5, "widget_type": "history", "show_play_time": true}	t	f	0.00	3	2025-07-10 12:21:51.264399+00
9	2	Balance Display	balance_display	widget	{"show_bonus": true, "widget_type": "balance", "show_currency": true, "refresh_interval": 10000}	t	f	0.00	4	2025-07-10 12:21:51.264399+00
10	2	Quick Actions Menu	quick_actions	navigation	{"menu_items": [{"icon": "plus", "label": "Deposit", "action": "deposit"}, {"icon": "minus", "label": "Withdraw", "action": "withdraw"}, {"icon": "user", "label": "Profile", "action": "profile"}, {"icon": "help", "label": "Support", "action": "support"}]}	t	f	0.00	5	2025-07-10 12:21:51.264399+00
11	3	Advanced Color Customization	advanced_colors	color_scheme	{"accent": "#EC4899", "primary": "#6366F1", "surface": "#374151", "secondary": "#8B5CF6", "background": "#1F2937", "text_primary": "#F9FAFB", "text_secondary": "#D1D5DB"}	t	t	9.99	1	2025-07-10 12:21:51.264399+00
12	3	Custom Animations	custom_animations	animation	{"hover_effects": true, "smooth_scroll": true, "page_transitions": true, "loading_animations": true}	t	t	14.99	2	2025-07-10 12:21:51.264399+00
13	3	Premium Navigation	premium_nav	navigation	{"style": "modern", "menu_items": [{"url": "/", "icon": "home", "label": "Home"}, {"url": "/games", "icon": "gamepad", "label": "Games"}, {"url": "/tournaments", "icon": "trophy", "label": "Tournaments"}, {"url": "/vip", "icon": "crown", "label": "VIP"}, {"url": "/support", "icon": "help-circle", "label": "Support"}], "show_badges": true}	t	t	19.99	3	2025-07-10 12:21:51.264399+00
14	4	Gaming Animations	gaming_animations	animation	{"win_animations": true, "confetti_on_win": true, "jackpot_effects": true, "particle_effects": true}	t	t	24.99	1	2025-07-10 12:21:51.264399+00
15	4	Live Chat Widget	live_chat	widget	{"position": "bottom-right", "auto_open": false, "widget_type": "chat", "show_online_status": true}	t	t	19.99	2	2025-07-10 12:21:51.264399+00
16	4	Advanced Game Filters	advanced_filters	widget	{"widget_type": "filters", "filter_types": ["provider", "category", "volatility", "rtp", "theme"], "show_advanced_options": true}	t	t	14.99	3	2025-07-10 12:21:51.264399+00
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.templates (id, name, description, type, category, version, author, is_active, is_default, is_premium, price, currency, created_at, updated_at) FROM stdin;
1	Admin Dashboard Pro	Professional admin dashboard template	admin	dashboard	1.0.0	System	t	t	f	0.00	USD	2025-07-10 12:21:16.035548+00	2025-07-10 12:21:16.035548+00
2	User Gaming Interface	Modern gaming interface for users	user	gaming	1.0.0	System	t	t	f	0.00	USD	2025-07-10 12:21:16.035548+00	2025-07-10 12:21:16.035548+00
3	Premium Dark Theme	Premium dark theme with customization	user	premium	1.0.0	System	t	f	t	29.99	USD	2025-07-10 12:21:16.035548+00	2025-07-10 12:21:16.035548+00
4	Admin Dashboard Pro	Professional admin dashboard with advanced analytics and user management	admin	dashboard	1.0.0	System	t	t	f	0.00	USD	2025-07-10 12:21:51.264399+00	2025-07-10 12:21:51.264399+00
5	User Gaming Interface	Modern gaming interface optimized for user experience	user	gaming	1.0.0	System	t	t	f	0.00	USD	2025-07-10 12:21:51.264399+00	2025-07-10 12:21:51.264399+00
6	Premium Dark Theme	Premium dark theme with advanced customization options	user	premium	1.0.0	System	t	f	t	29.99	USD	2025-07-10 12:21:51.264399+00	2025-07-10 12:21:51.264399+00
7	Gaming Pro Theme	Professional gaming theme with animations and effects	user	premium	1.0.0	System	t	f	t	49.99	USD	2025-07-10 12:21:51.264399+00	2025-07-10 12:21:51.264399+00
8	Mobile Gaming Interface	Optimized interface for mobile gaming experience	user	mobile	1.0.0	System	t	f	f	19.99	USD	2025-07-10 12:21:51.264399+00	2025-07-10 12:21:51.264399+00
\.


--
-- Data for Name: tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tokens (id, user_id, access_token, refresh_token, expired_at, is_active, created_at, created_by, updated_at, updated_by, game_id, category) FROM stdin;
169	2	17d55066f5ca96b820ea552477ed9a94	refresh_token_for_17d55066f5ca96b820ea552477ed9a94	2025-08-13 12:35:18.052+00	t	2025-07-12 13:39:12.952234+00	1	2025-07-14 12:35:18.053116+00	1	\N	\N
22	24	badc1822f53d00f37b9aae7485585082	refresh_token_for_badc1822f53d00f37b9aae7485585082	2025-08-14 14:18:15.242+00	t	2025-07-09 13:47:22.647468+00	1	2025-07-15 14:18:15.24285+00	1	\N	\N
2	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MjYzODE4NiwiZXhwIjoxNzUyNjQxNzg2fQ.aqFEHEFdUY78OqVyEu6sKXQ8VMZ2Vc9OLaCJVlgTOtQ	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MjYzODE4NiwiZXhwIjoxNzUzMjQyOTg2fQ.5Q5GO89u7ijVq7rPzuhWZxADCgLMXho2iY5U9aD24DQ	2025-08-15 03:56:26.192+00	t	2025-07-07 17:56:56.516849+00	1	2025-07-16 03:56:26.192416+00	1	\N	\N
127	30	fdfb1e9ef9d1f1b513e0dfca4b3018f9	refresh_token_for_fdfb1e9ef9d1f1b513e0dfca4b3018f9	2025-08-13 14:43:51.583+00	t	2025-07-12 07:33:13.682391+00	1	2025-07-14 14:43:51.583966+00	1	\N	\N
564	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE2MjkzMywiZXhwIjoxNzUzMTY2NTMzfQ.b06N2no5ZJk6diP011parE4MOm5-UgvOJlM_r0eDTvQ	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE2MjkzMywiZXhwIjoxNzUzNzY3NzMzfQ.ReH4OV_JZWgJHcwspk5tJZNLgz3jenOlb2KRBa119J4	2025-08-21 05:42:13.485+00	t	2025-07-22 05:42:13.485612+00	1	2025-07-22 05:42:13.485612+00	1	\N	\N
565	1	1c789807eade21130144d14cb9359f2e	refresh_token_for_1c789807eade21130144d14cb9359f2e	2025-08-21 05:47:07.606+00	t	2025-07-22 05:47:07.606735+00	1	2025-07-22 05:47:07.606735+00	1	52	slots
566	1	3fc953b21d72186f50389738638eb5cf	refresh_token_for_3fc953b21d72186f50389738638eb5cf	2025-08-21 05:49:29.593+00	t	2025-07-22 05:49:29.59388+00	1	2025-07-22 05:49:29.59388+00	1	52	slots
567	1	1be7e189f2f8751f5af8f6ebd5610913	refresh_token_for_1be7e189f2f8751f5af8f6ebd5610913	2025-08-21 05:51:35.626+00	t	2025-07-22 05:51:35.62676+00	1	2025-07-22 05:51:35.62676+00	1	52	slots
568	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE2Mzc2MiwiZXhwIjoxNzUzMTY3MzYyfQ.hhGixX28o0O4GWb62-V7mIn2MFVAiS7EydrOruf9vu0	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE2Mzc2MiwiZXhwIjoxNzUzNzY4NTYyfQ.FeafqzDkD0ypO-NYfDjlLOAb6SGX_BRkvDpULa9TAGk	2025-08-21 05:56:02.778+00	t	2025-07-22 05:56:02.779231+00	1	2025-07-22 05:56:02.779231+00	1	\N	\N
569	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE3MjIyMiwiZXhwIjoxNzUzMTc1ODIyfQ.CVYN1Ul4QNIwZPtLiNCnQ3HI4v3nMcsas0qgDyIvbgg	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE3MjIyMiwiZXhwIjoxNzUzNzc3MDIyfQ.o1hmuI-2PQa8QVbO3la96u2TgD8EMwLg_3aJrDndVo8	2025-08-21 08:17:02.916+00	t	2025-07-22 08:17:02.91709+00	1	2025-07-22 08:17:02.91709+00	1	\N	\N
570	1	aa47eb3ec3ff2078bed17dcc17380079	refresh_token_for_aa47eb3ec3ff2078bed17dcc17380079	2025-08-21 08:17:16.054+00	t	2025-07-22 08:17:16.054234+00	1	2025-07-22 08:17:16.054234+00	1	41	slots
571	1	4cebabb1e5a7bf6deb78b1e744e2dce2	refresh_token_for_4cebabb1e5a7bf6deb78b1e744e2dce2	2025-08-21 08:18:53.984+00	t	2025-07-22 08:18:53.985033+00	1	2025-07-22 08:18:53.985033+00	1	41	slots
572	1	567c74b6c12c19f9ad0684d68f5c0aa1	refresh_token_for_567c74b6c12c19f9ad0684d68f5c0aa1	2025-08-21 08:27:16.37+00	t	2025-07-22 08:27:16.371324+00	1	2025-07-22 08:27:16.371324+00	1	41	slots
573	1	d07fd871dd5462b343c93b9b684fdb32	refresh_token_for_d07fd871dd5462b343c93b9b684fdb32	2025-08-21 08:28:12.817+00	t	2025-07-22 08:28:12.817986+00	1	2025-07-22 08:28:12.817986+00	1	41	slots
574	1	450d71917e86f015b2b81a85fc812829	refresh_token_for_450d71917e86f015b2b81a85fc812829	2025-08-21 08:29:49.265+00	t	2025-07-22 08:29:49.266024+00	1	2025-07-22 08:29:49.266024+00	1	42	slots
575	1	dc0271bacbd27867467504caab7c68ed	refresh_token_for_dc0271bacbd27867467504caab7c68ed	2025-08-21 08:31:14.173+00	t	2025-07-22 08:31:14.175305+00	1	2025-07-22 08:31:14.175305+00	1	43	slots
576	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE3MzA3OSwiZXhwIjoxNzUzMTc2Njc5fQ.3FB4IsLVnIC9YeCpXLfTt9wugmAgxdCYHsEo7AJcTgQ	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE3MzA3OSwiZXhwIjoxNzUzNzc3ODc5fQ.a4OoF9DqOkcJFkV2AsCqNDUwtkJkGU_K7QRP8sSJvw4	2025-08-21 08:31:19.146+00	t	2025-07-22 08:31:19.146852+00	1	2025-07-22 08:31:19.146852+00	1	\N	\N
577	1	b675b615291c20c013cb80a254e48cdd	refresh_token_for_b675b615291c20c013cb80a254e48cdd	2025-08-21 08:31:39.979+00	t	2025-07-22 08:31:39.980037+00	1	2025-07-22 08:31:39.980037+00	1	43	slots
578	1	d4c139798455774e4254e657e9fe34c7	refresh_token_for_d4c139798455774e4254e657e9fe34c7	2025-08-21 08:47:21.085+00	t	2025-07-22 08:47:21.086226+00	1	2025-07-22 08:47:21.086226+00	1	43	slots
579	1	39c71baba2cf5ce9e09276d7e0b7e03d	refresh_token_for_39c71baba2cf5ce9e09276d7e0b7e03d	2025-08-21 08:50:29.573+00	t	2025-07-22 08:50:29.574668+00	1	2025-07-22 08:50:29.574668+00	1	43	slots
580	1	399db9707203e3fd048b90165693d277	refresh_token_for_399db9707203e3fd048b90165693d277	2025-08-21 08:58:00.486+00	t	2025-07-22 08:58:00.486609+00	1	2025-07-22 08:58:00.486609+00	1	43	slots
581	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE3NTc1MSwiZXhwIjoxNzUzMTc5MzUxfQ.NUZ4VSJ5OLjwq42LvDXVAYu3sZ161XlKAbZl7gw5mG8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE3NTc1MSwiZXhwIjoxNzUzNzgwNTUxfQ.PqdSTCxedotdNvTsvHPeFOEN9m2AVFOsHdI0Gz00o0Y	2025-08-21 09:15:51.404+00	t	2025-07-22 09:15:51.404551+00	1	2025-07-22 09:15:51.404551+00	1	\N	\N
582	24	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0LCJ1c2VybmFtZSI6ImFtaXIiLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4MTQ4OSwiZXhwIjoxNzUzMTg1MDg5fQ.5UkNhKEm3T8deIuFhLihBDidIGo6Kp9kogMnhhKQkds	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0LCJ1c2VybmFtZSI6ImFtaXIiLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4MTQ4OSwiZXhwIjoxNzUzNzg2Mjg5fQ.oUf2JLaVPt1_kLBCx2TP_cKun8hKQOcnP-i0z8IhbSQ	2025-08-21 10:51:29.294+00	t	2025-07-22 10:51:29.294479+00	1	2025-07-22 10:51:29.294479+00	1	\N	\N
583	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4MTYzNCwiZXhwIjoxNzUzMTg1MjM0fQ.c-SaGfBjkJlYkEUHYW7vjIGjTCfyvrpG4Ym74stR0Kw	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4MTYzNCwiZXhwIjoxNzUzNzg2NDM0fQ.l0npTmQD4hD0C5lRZh5sqyB2tkiZ3CoeYE3fzO23Rho	2025-08-21 10:53:54.5+00	t	2025-07-22 10:53:54.500713+00	1	2025-07-22 10:53:54.500713+00	1	\N	\N
584	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4MTY0NiwiZXhwIjoxNzUzMTg1MjQ2fQ.WGwy8QX7Ra5Z3Hu15iWlKtc2XM-VqqVuuK8i5hIw444	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4MTY0NiwiZXhwIjoxNzUzNzg2NDQ2fQ.t_L_taUH1dHWFW03JngBw3-X2ZjUZ6ZYZ8r_gxBTDi0	2025-08-21 10:54:06.599+00	t	2025-07-22 10:54:06.599513+00	1	2025-07-22 10:54:06.599513+00	1	\N	\N
585	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4MjY3MiwiZXhwIjoxNzUzMTg2MjcyfQ.JIE5L_gJe9e4ZM8TLMzqbEUN5BgD2X9wuIPBVOqBy_Q	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4MjY3MiwiZXhwIjoxNzUzNzg3NDcyfQ.-k7O5oXPkQdCcV2v7c8Hut15JcOHtc4W_Hi_cVrquNg	2025-08-21 11:11:12.773+00	t	2025-07-22 11:11:12.773597+00	1	2025-07-22 11:11:12.773597+00	1	\N	\N
586	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4NTgwNiwiZXhwIjoxNzUzMTg5NDA2fQ.utlYy_zrs_RxwIFKzUplalj0rZ2DaS6xJ_96qfhX8pA	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4NTgwNiwiZXhwIjoxNzUzNzkwNjA2fQ.93P1I-Nfnt4CI-KOBwddQu8uX9CzLBSpRIf_kGAxUjw	2025-08-21 12:03:26.705+00	t	2025-07-22 12:03:26.705512+00	1	2025-07-22 12:03:26.705512+00	1	\N	\N
587	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4NTgxNiwiZXhwIjoxNzUzMTg5NDE2fQ.h6Rh_rDAnbo-sXQYFSLJl7AfTY4zGqPVvyDt5b96Ii8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4NTgxNiwiZXhwIjoxNzUzNzkwNjE2fQ.wueRhuVQwqa3QASy4hAfnnuOI8doibBoSMAIRLlSHUY	2025-08-21 12:03:36.17+00	t	2025-07-22 12:03:36.170383+00	1	2025-07-22 12:03:36.170383+00	1	\N	\N
588	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4Njk1MiwiZXhwIjoxNzUzMTkwNTUyfQ.428OKIHdsuSOLwJL4SjTdYDc5rhRlO_habvsR4Q443s	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4Njk1MiwiZXhwIjoxNzUzNzkxNzUyfQ.Ar4mQ-wuLlaiOgI6lcEFLfY3E2V6pGtkYvW74rGVmes	2025-08-21 12:22:32.2+00	t	2025-07-22 12:22:32.200848+00	1	2025-07-22 12:22:32.200848+00	1	\N	\N
589	1	e8b608df41c2e3dd21e56f3c595493dd	refresh_token_for_e8b608df41c2e3dd21e56f3c595493dd	2025-08-21 12:22:52.114+00	t	2025-07-22 12:22:52.115161+00	1	2025-07-22 12:22:52.115161+00	1	43	slots
590	1	84d8b78bbc3a383520e087557d7e8e3b	refresh_token_for_84d8b78bbc3a383520e087557d7e8e3b	2025-08-21 12:25:09.357+00	t	2025-07-22 12:25:09.360897+00	1	2025-07-22 12:25:09.360897+00	1	43	slots
591	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4NzM3OCwiZXhwIjoxNzUzMTkwOTc4fQ.hI3t4nkIiIlEQfFKHfD-dNp4Z5a5FQRf9nzXFKgj7rE	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4NzM3OCwiZXhwIjoxNzUzNzkyMTc4fQ.AOJwuzCKgKsKBGmdyWIZoDMLZFo4x7drrrynRgR6p7Y	2025-08-21 12:29:38.444+00	t	2025-07-22 12:29:38.444452+00	1	2025-07-22 12:29:38.444452+00	1	\N	\N
592	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4NzgxNCwiZXhwIjoxNzUzMTkxNDE0fQ.y2wOlEb6DprhWxov1e8cvUry6AyiAE2gG8JFr3zZkq4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE4NzgxNCwiZXhwIjoxNzUzNzkyNjE0fQ.ftbPjJ8uPFA-GBovWMrlO2FaVjGFK_25vg7IMtg6-3s	2025-08-21 12:36:54.348+00	t	2025-07-22 12:36:54.34863+00	1	2025-07-22 12:36:54.34863+00	1	\N	\N
593	1	22f9b9af50237783636842f01d4389a5	refresh_token_for_22f9b9af50237783636842f01d4389a5	2025-08-21 12:37:12.212+00	t	2025-07-22 12:37:12.212953+00	1	2025-07-22 12:37:12.212953+00	1	52	slots
594	1	06b642a15bb779a6ddd1103c834c2ba0	refresh_token_for_06b642a15bb779a6ddd1103c834c2ba0	2025-08-21 13:17:19.012+00	t	2025-07-22 13:17:19.01615+00	1	2025-07-22 13:17:19.01615+00	1	41	slots
595	1	25d66d2177f2963387a73929848d2c5a	refresh_token_for_25d66d2177f2963387a73929848d2c5a	2025-08-21 13:18:31.094+00	t	2025-07-22 13:18:31.098264+00	1	2025-07-22 13:18:31.098264+00	1	42	slots
596	1	2acf60a316cce996a7ae1eeaae6d16a8	refresh_token_for_2acf60a316cce996a7ae1eeaae6d16a8	2025-08-21 13:19:04.508+00	t	2025-07-22 13:19:04.508412+00	1	2025-07-22 13:19:04.508412+00	1	42	slots
597	1	e865d6755bbffc091c7da37a1dc3ebb3	refresh_token_for_e865d6755bbffc091c7da37a1dc3ebb3	2025-08-21 13:21:17.946+00	t	2025-07-22 13:21:17.946645+00	1	2025-07-22 13:21:17.946645+00	1	41	slots
598	1	c2958cc4fa1971c579f8ab9e930fb6cf	refresh_token_for_c2958cc4fa1971c579f8ab9e930fb6cf	2025-08-21 13:21:44.823+00	t	2025-07-22 13:21:44.824033+00	1	2025-07-22 13:21:44.824033+00	1	42	slots
599	1	b64626a28be852560ece094e5c6ef538	refresh_token_for_b64626a28be852560ece094e5c6ef538	2025-08-21 13:29:52.463+00	t	2025-07-22 13:29:52.463857+00	1	2025-07-22 13:29:52.463857+00	1	42	slots
600	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE5MjgwOCwiZXhwIjoxNzUzMTk2NDA4fQ.mWoMyWww-aJlzALIv0hCGe15RaakRUJhOLwowE1u8wo	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE5MjgwOCwiZXhwIjoxNzUzNzk3NjA4fQ.WqviCCF7lvtZ2rO7XQlPx8EdHQ76TlrEk3QOxcTohUI	2025-08-21 14:00:08.041+00	t	2025-07-22 14:00:08.041384+00	1	2025-07-22 14:00:08.041384+00	1	\N	\N
601	1	366e37467ef31aafb5f26c995b14ed7e	refresh_token_for_366e37467ef31aafb5f26c995b14ed7e	2025-08-21 14:02:37.508+00	t	2025-07-22 14:02:37.516594+00	1	2025-07-22 14:02:37.516594+00	1	51	slots
602	1	0f49eb0c415eed81dc3235b4e28463cc	refresh_token_for_0f49eb0c415eed81dc3235b4e28463cc	2025-08-21 14:05:42.107+00	t	2025-07-22 14:05:42.110422+00	1	2025-07-22 14:05:42.110422+00	1	51	slots
603	1	7ebbe12b8060dd1e4540853180fd055b	refresh_token_for_7ebbe12b8060dd1e4540853180fd055b	2025-08-21 14:09:56.823+00	t	2025-07-22 14:09:56.824089+00	1	2025-07-22 14:09:56.824089+00	1	51	slots
604	1	f138972a090c75d2556c01cd65466a27	refresh_token_for_f138972a090c75d2556c01cd65466a27	2025-08-21 14:10:01.308+00	t	2025-07-22 14:10:01.308251+00	1	2025-07-22 14:10:01.308251+00	1	51	slots
605	1	cde7019eff2a1b9ce1d8022573a10007	refresh_token_for_cde7019eff2a1b9ce1d8022573a10007	2025-08-21 14:10:18.277+00	t	2025-07-22 14:10:18.277208+00	1	2025-07-22 14:10:18.277208+00	1	51	slots
606	24	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0LCJ1c2VybmFtZSI6ImFtaXIiLCJyb2xlIjoiRGV2ZWxvcGVyIiwicm9sZUlkIjo1LCJpYXQiOjE3NTMxOTM3MDcsImV4cCI6MTc1MzE5NzMwN30.HeJYb1j4JWc4nB_fKkcDYNE9kPU05rLNXM6kUHsW4xQ	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0LCJ1c2VybmFtZSI6ImFtaXIiLCJyb2xlIjoiRGV2ZWxvcGVyIiwicm9sZUlkIjo1LCJpYXQiOjE3NTMxOTM3MDcsImV4cCI6MTc1Mzc5ODUwN30.Zsn-nsDvMOsl-E01960g8plMeGOkY1G6Yvdi9GLmycg	2025-08-21 14:15:07.607+00	t	2025-07-22 14:15:07.607407+00	1	2025-07-22 14:15:07.607407+00	1	\N	\N
607	24	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0LCJ1c2VybmFtZSI6ImFtaXIiLCJyb2xlIjoiRGV2ZWxvcGVyIiwicm9sZUlkIjo1LCJpYXQiOjE3NTMxOTM5MTcsImV4cCI6MTc1MzE5NzUxN30.R9o715oBGnna6YJSo8XaeZTpA09QHykkUCmXKOFdpRE	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0LCJ1c2VybmFtZSI6ImFtaXIiLCJyb2xlIjoiRGV2ZWxvcGVyIiwicm9sZUlkIjo1LCJpYXQiOjE3NTMxOTM5MTcsImV4cCI6MTc1Mzc5ODcxN30.2937-FgnDVdzKxclINA7b2AUquiTTQCj5YVofescA8I	2025-08-21 14:18:37.222+00	t	2025-07-22 14:18:37.223266+00	1	2025-07-22 14:18:37.223266+00	1	\N	\N
608	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE5NDI4OCwiZXhwIjoxNzUzMTk3ODg4fQ.VAUCIRq_QZscRB-JbHeBaPxr1lNWELFq3j1TdFtLeXU	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzE5NDI4OCwiZXhwIjoxNzUzNzk5MDg4fQ.m_Xi2AHbKFldzQpjYgkv2eN_VljtLCE0d_cf8rgPjOw	2025-08-21 14:24:48.903+00	t	2025-07-22 14:24:48.903779+00	1	2025-07-22 14:24:48.903779+00	1	\N	\N
609	1	f401c0c39f2fa5e2febf955f9dd045db	refresh_token_for_f401c0c39f2fa5e2febf955f9dd045db	2025-08-21 14:25:04.571+00	t	2025-07-22 14:25:04.571524+00	1	2025-07-22 14:25:04.571524+00	1	42	slots
610	2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInVzZXJuYW1lIjoicGxheWVyMSIsInJvbGUiOiJQbGF5ZXIiLCJyb2xlSWQiOjIsImlhdCI6MTc1MzE5NDg1NCwiZXhwIjoxNzUzMTk4NDU0fQ.osX5OcpgcVhTZtO21N2w0VtLEhTLmyQllMjvyCSbefA	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInVzZXJuYW1lIjoicGxheWVyMSIsInJvbGUiOiJQbGF5ZXIiLCJyb2xlSWQiOjIsImlhdCI6MTc1MzE5NDg1NCwiZXhwIjoxNzUzNzk5NjU0fQ.UwYGPV4-6qxN3q61V5rxy9jwksibHlcO7vWV832qCTU	2025-08-21 14:34:14.194+00	t	2025-07-22 14:34:14.196848+00	1	2025-07-22 14:34:14.196848+00	1	\N	\N
611	2	11ca7ba8d734f2f12ade7b287c749cb3	refresh_token_for_11ca7ba8d734f2f12ade7b287c749cb3	2025-08-21 14:34:21.49+00	t	2025-07-22 14:34:21.490575+00	1	2025-07-22 14:34:21.490575+00	1	51	slots
612	2	11aaa69454ee171d2d99e06ec2221885	refresh_token_for_11aaa69454ee171d2d99e06ec2221885	2025-08-21 14:35:22.093+00	t	2025-07-22 14:35:22.093658+00	1	2025-07-22 14:35:22.093658+00	1	43	slots
613	2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInVzZXJuYW1lIjoicGxheWVyMSIsInJvbGUiOiJQbGF5ZXIiLCJyb2xlSWQiOjIsImlhdCI6MTc1MzE5NTQ0OSwiZXhwIjoxNzUzMTk5MDQ5fQ.OxatT6NFedx6V_zCl-I6ITYw-QAIIHZ302ztM_wo0BU	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInVzZXJuYW1lIjoicGxheWVyMSIsInJvbGUiOiJQbGF5ZXIiLCJyb2xlSWQiOjIsImlhdCI6MTc1MzE5NTQ0OSwiZXhwIjoxNzUzODAwMjQ5fQ.axUk_R9IuDNjvcTi7ocjRM6P8SDtaIE4vIa7D5ANm0E	2025-08-21 14:44:09.331+00	t	2025-07-22 14:44:09.331907+00	1	2025-07-22 14:44:09.331907+00	1	\N	\N
614	2	86daf8191ad51d5207ad8c352c401f12	refresh_token_for_86daf8191ad51d5207ad8c352c401f12	2025-08-21 14:44:14.34+00	t	2025-07-22 14:44:14.341144+00	1	2025-07-22 14:44:14.341144+00	1	59	crashgame
615	2	33fd2e09954dcaef4e01c2f173323286	refresh_token_for_33fd2e09954dcaef4e01c2f173323286	2025-08-21 14:45:22.915+00	t	2025-07-22 14:45:22.915762+00	1	2025-07-22 14:45:22.915762+00	1	49	slots
616	2	e47e6951e041d1581d15217b1c0236a4	refresh_token_for_e47e6951e041d1581d15217b1c0236a4	2025-08-21 14:56:33.854+00	t	2025-07-22 14:56:33.855201+00	1	2025-07-22 14:56:33.855201+00	1	49	slots
617	24	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0LCJ1c2VybmFtZSI6ImFtaXIiLCJyb2xlIjoiRGV2ZWxvcGVyIiwicm9sZUlkIjo1LCJpYXQiOjE3NTMxOTk1NjgsImV4cCI6MTc1MzIwMzE2OH0.UejqZf2xrQZX07lRicac92Ma-TRWfE3jcjr6Y2vE1SY	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0LCJ1c2VybmFtZSI6ImFtaXIiLCJyb2xlIjoiRGV2ZWxvcGVyIiwicm9sZUlkIjo1LCJpYXQiOjE3NTMxOTk1NjgsImV4cCI6MTc1MzgwNDM2OH0.ZYksCeUGGJhLrDxUsDlLX2c1dyQweRe-t9jayZkykVg	2025-08-21 15:52:48.705+00	t	2025-07-22 15:52:48.705467+00	1	2025-07-22 15:52:48.705467+00	1	\N	\N
618	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIwMDIxNywiZXhwIjoxNzUzMjAzODE3fQ.o4KOxBUVBT5N1wFeKb6fTmb379AFcB6UrePbj0b2teA	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIwMDIxNywiZXhwIjoxNzUzODA1MDE3fQ.-zlMBHXC9fmI3JMIySAMAigmUli20mnLRPrXREh8mnA	2025-08-21 16:03:37.846+00	t	2025-07-22 16:03:37.84642+00	1	2025-07-22 16:03:37.84642+00	1	\N	\N
619	1	aa6aae63b1218773f2647caf7d92fa8a	refresh_token_for_aa6aae63b1218773f2647caf7d92fa8a	2025-08-21 16:03:46.382+00	t	2025-07-22 16:03:46.382771+00	1	2025-07-22 16:03:46.382771+00	1	41	slots
620	1	7a95121282d5ed745b8f07cd501ce1ca	refresh_token_for_7a95121282d5ed745b8f07cd501ce1ca	2025-08-21 16:04:32.292+00	t	2025-07-22 16:04:32.292806+00	1	2025-07-22 16:04:32.292806+00	1	40	slots
621	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIwMDMxNiwiZXhwIjoxNzUzMjAzOTE2fQ.hV1F03X-TD-aGg-XAgrn2YP_OroDF0bD-78UoEdPQO4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIwMDMxNiwiZXhwIjoxNzUzODA1MTE2fQ.GkPpvvBlrJCgTHD9t-4tbQM2XHNt3NNj0LjSYJEMwpc	2025-08-21 16:05:16.265+00	t	2025-07-22 16:05:16.265254+00	1	2025-07-22 16:05:16.265254+00	1	\N	\N
622	1	4c7bec22fa9110632a00f638262f3d71	refresh_token_for_4c7bec22fa9110632a00f638262f3d71	2025-08-21 16:05:21.973+00	t	2025-07-22 16:05:21.974121+00	1	2025-07-22 16:05:21.974121+00	1	40	slots
623	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIwMDM1NiwiZXhwIjoxNzUzMjAzOTU2fQ.fqRt18ZGF9nVHtIYSr5qXleVjI3coJZ8QABrRzppR2Y	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIwMDM1NiwiZXhwIjoxNzUzODA1MTU2fQ.zzxdxxn0TVmhxaZNmGkHMRn2Uip0Lu00zAAV0aqqeC0	2025-08-21 16:05:56.717+00	t	2025-07-22 16:05:56.717279+00	1	2025-07-22 16:05:56.717279+00	1	\N	\N
624	1	51ac8110a3cd9bb1f4329f31bfefcaff	refresh_token_for_51ac8110a3cd9bb1f4329f31bfefcaff	2025-08-21 16:06:02.839+00	t	2025-07-22 16:06:02.839774+00	1	2025-07-22 16:06:02.839774+00	1	53	tablegame
625	1	f59d9f5b466b4e566e70b81202170db0	refresh_token_for_f59d9f5b466b4e566e70b81202170db0	2025-08-21 16:06:34.585+00	t	2025-07-22 16:06:34.58541+00	1	2025-07-22 16:06:34.58541+00	1	39	slots
626	1	899afdbd4bdaa94ac02aeaba8a8914e4	refresh_token_for_899afdbd4bdaa94ac02aeaba8a8914e4	2025-08-21 16:06:54.159+00	t	2025-07-22 16:06:54.160184+00	1	2025-07-22 16:06:54.160184+00	1	42	slots
627	1	33eb2303a5cfb056a87cce22c89bbf51	refresh_token_for_33eb2303a5cfb056a87cce22c89bbf51	2025-08-21 16:07:14.968+00	t	2025-07-22 16:07:14.968738+00	1	2025-07-22 16:07:14.968738+00	1	44	slots
628	1	644e34c08a073b1f55f25ebb88a85a5e	refresh_token_for_644e34c08a073b1f55f25ebb88a85a5e	2025-08-21 16:07:35.49+00	t	2025-07-22 16:07:35.491124+00	1	2025-07-22 16:07:35.491124+00	1	48	slots
629	1	86034e531c8b34ce1b8f23af3e27ab34	refresh_token_for_86034e531c8b34ce1b8f23af3e27ab34	2025-08-21 16:08:18.698+00	t	2025-07-22 16:08:18.698709+00	1	2025-07-22 16:08:18.698709+00	1	41	slots
630	1	1898aea88effed9be3afd0ec0cd6386f	refresh_token_for_1898aea88effed9be3afd0ec0cd6386f	2025-08-21 16:09:13.077+00	t	2025-07-22 16:09:13.077287+00	1	2025-07-22 16:09:13.077287+00	1	45	slots
631	1	5a45a973ec8e9c742c16fa0d2f19f168	refresh_token_for_5a45a973ec8e9c742c16fa0d2f19f168	2025-08-21 16:09:36.703+00	t	2025-07-22 16:09:36.703209+00	1	2025-07-22 16:09:36.703209+00	1	47	slots
632	1	61449eea0b106feb54a69799e06fbfb1	refresh_token_for_61449eea0b106feb54a69799e06fbfb1	2025-08-21 16:10:02.147+00	t	2025-07-22 16:10:02.148079+00	1	2025-07-22 16:10:02.148079+00	1	42	slots
633	1	5c537f788e5ed39353e565dba646c8c3	refresh_token_for_5c537f788e5ed39353e565dba646c8c3	2025-08-21 16:10:15.217+00	t	2025-07-22 16:10:15.217724+00	1	2025-07-22 16:10:15.217724+00	1	42	slots
634	1	39fde0a917eca9b05bada3909628d648	refresh_token_for_39fde0a917eca9b05bada3909628d648	2025-08-21 16:10:28.134+00	t	2025-07-22 16:10:28.134241+00	1	2025-07-22 16:10:28.134241+00	1	42	slots
635	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIwMDk4MSwiZXhwIjoxNzUzMjA0NTgxfQ.rUXPIF6JYlmv1acpIAZbtMST-LadQYwXbLqym6CVLOU	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIwMDk4MSwiZXhwIjoxNzUzODA1NzgxfQ.M92jdUYIOZl17XmkfgmaJxzgztGGU5YwaAXv-wi-e4Y	2025-08-21 16:16:21.367+00	t	2025-07-22 16:16:21.367274+00	1	2025-07-22 16:16:21.367274+00	1	\N	\N
636	1	196137193c16c6f6b21c791a0da7d0f9	refresh_token_for_196137193c16c6f6b21c791a0da7d0f9	2025-08-21 16:17:28.619+00	t	2025-07-22 16:17:28.619985+00	1	2025-07-22 16:17:28.619985+00	1	39	slots
637	1	a4945f2604c3ab7a297e59f9a5c5ae7e	refresh_token_for_a4945f2604c3ab7a297e59f9a5c5ae7e	2025-08-21 16:17:43.989+00	t	2025-07-22 16:17:43.990053+00	1	2025-07-22 16:17:43.990053+00	1	41	slots
638	1	28c1755b3ab77c4fed5ef5c46ca6c60c	refresh_token_for_28c1755b3ab77c4fed5ef5c46ca6c60c	2025-08-21 16:22:02.823+00	t	2025-07-22 16:22:02.824947+00	1	2025-07-22 16:22:02.824947+00	1	58	tablegame
639	1	db00177d3aeb94f66ed0cb70626cacdd	refresh_token_for_db00177d3aeb94f66ed0cb70626cacdd	2025-08-21 16:23:06.088+00	t	2025-07-22 16:23:06.089148+00	1	2025-07-22 16:23:06.089148+00	1	42	slots
640	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIwNzQ4NCwiZXhwIjoxNzUzMjExMDg0fQ.nG9hYeOF_zb4hPksRKjAWCAnA4xTxAvRpDnVH6QHya0	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIwNzQ4NCwiZXhwIjoxNzUzODEyMjg0fQ.itLWZquJNtQkwgKbeLGqqmZqNPuWOh1hvHepbHt2kTM	2025-08-21 18:04:44.318+00	t	2025-07-22 18:04:44.318956+00	1	2025-07-22 18:04:44.318956+00	1	\N	\N
641	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIwNzQ5OCwiZXhwIjoxNzUzMjExMDk4fQ.g9B1xjNQNkHu2eVi29sxLFIqPOpjl_51mD2W5MnwQiA	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIwNzQ5OCwiZXhwIjoxNzUzODEyMjk4fQ.uhze4WrGQNhH9a5_L7yk9RXYxPmlOoob0wegcPk_n4I	2025-08-21 18:04:58.568+00	t	2025-07-22 18:04:58.568368+00	1	2025-07-22 18:04:58.568368+00	1	\N	\N
642	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIxMjE1MywiZXhwIjoxNzUzMjE1NzUzfQ._aRrwYmHFnW9Bk7a4vK2vSvsdNDwoflKVxuPeqqC314	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIxMjE1MywiZXhwIjoxNzUzODE2OTUzfQ.RxEHZivcmCOJZZX_GSj5kR6RhlVcHQ8BaACs6zUwbiQ	2025-08-21 19:22:33.699+00	t	2025-07-22 19:22:33.699553+00	1	2025-07-22 19:22:33.699553+00	1	\N	\N
643	1	9fbce27e85b6fad46677a7a18e8bc3c6	refresh_token_for_9fbce27e85b6fad46677a7a18e8bc3c6	2025-08-21 19:22:48.406+00	t	2025-07-22 19:22:48.406279+00	1	2025-07-22 19:22:48.406279+00	1	41	slots
644	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIzNjgwMCwiZXhwIjoxNzUzMjQwNDAwfQ.yFj5I873zIS9rR6MMD5WfCp0l_2pdBxOTwhJVieECZM	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzIzNjgwMCwiZXhwIjoxNzUzODQxNjAwfQ.jMu6mpatdKYLRzTCq-ftIEogFD40yydPyUGo1zro_Wk	2025-08-22 02:13:20.38+00	t	2025-07-23 02:13:20.381881+00	1	2025-07-23 02:13:20.381881+00	1	\N	\N
645	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzI0MzE1OSwiZXhwIjoxNzUzMjQ2NzU5fQ.j7T9EH0_-28rr3MpgzmSG52MlRrUSL43aAbVrsT6an4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzI0MzE1OSwiZXhwIjoxNzUzODQ3OTU5fQ.W27qrjWFCMlQw5G4yV4ifgs3heTXM5S9LMrL7t9sb4o	2025-08-22 03:59:19.018+00	t	2025-07-23 03:59:19.018472+00	1	2025-07-23 03:59:19.018472+00	1	\N	\N
646	1	9d51ea609946320fcc980ec5e201049f	refresh_token_for_9d51ea609946320fcc980ec5e201049f	2025-08-22 03:59:26.347+00	t	2025-07-23 03:59:26.348004+00	1	2025-07-23 03:59:26.348004+00	1	50	slots
647	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzI0MzMyNiwiZXhwIjoxNzUzMjQ2OTI2fQ.E3_DGGRT8NENxRohQE6sRouKRm41tn_Zq44sybs6EoM	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzI0MzMyNiwiZXhwIjoxNzUzODQ4MTI2fQ.665nUJjfC1CyqiFY4XWeOuErBendlOAedjWsNryqqaA	2025-08-22 04:02:06.852+00	t	2025-07-23 04:02:06.852499+00	1	2025-07-23 04:02:06.852499+00	1	\N	\N
648	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzI0NDQ1NSwiZXhwIjoxNzUzMjQ4MDU1fQ.4TpNL4B11BLhBiuk10_trgmSmR-h36JdYt_HgJY-pGQ	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzI0NDQ1NSwiZXhwIjoxNzUzODQ5MjU1fQ.ueIdb9Q6zO9mH07lf5FvYKeLr829OyoBXn_fCgTqEfI	2025-08-22 04:20:55.191+00	t	2025-07-23 04:20:55.192055+00	1	2025-07-23 04:20:55.192055+00	1	\N	\N
649	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzI1MTY5MywiZXhwIjoxNzUzMjU1MjkzfQ.3iTYemKQlPov0F-mwD-nh3Lk6e73aNayBYCgavM75-g	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzI1MTY5MywiZXhwIjoxNzUzODU2NDkzfQ.f--cT6kMsPm_IsqNXlI8EtVqlLOoBI3J7OKmZSHZ0-Y	2025-08-22 06:21:33.546+00	t	2025-07-23 06:21:33.547238+00	1	2025-07-23 06:21:33.547238+00	1	\N	\N
650	24	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0LCJ1c2VybmFtZSI6ImFtaXIiLCJyb2xlIjoiRGV2ZWxvcGVyIiwicm9sZUlkIjo1LCJpYXQiOjE3NTMyNzMwOTEsImV4cCI6MTc1MzI3NjY5MX0.3MvXX_bFmr9z4HF8ZOw_tXEiA7vqGQhlNtW4ABkxbkM	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0LCJ1c2VybmFtZSI6ImFtaXIiLCJyb2xlIjoiRGV2ZWxvcGVyIiwicm9sZUlkIjo1LCJpYXQiOjE3NTMyNzMwOTEsImV4cCI6MTc1Mzg3Nzg5MX0.sG9jiIZxWUgAe4ISDRDKtANt_iFIKjNe5IwnIhGkUqg	2025-08-22 12:18:11.749+00	t	2025-07-23 12:18:11.749211+00	1	2025-07-23 12:18:11.749211+00	1	\N	\N
651	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzI3MzE0NCwiZXhwIjoxNzUzMjc2NzQ0fQ.xVUtoFtJAUILBVBAzJtq9U8_LnWz9MLImueGga4qXSU	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzI3MzE0NCwiZXhwIjoxNzUzODc3OTQ0fQ.L0TatSEQ0h5U_a7PdFI80IMzEXMnuHX5g4phFq_9_VY	2025-08-22 12:19:04.656+00	t	2025-07-23 12:19:04.656818+00	1	2025-07-23 12:19:04.656818+00	1	\N	\N
652	24	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0LCJ1c2VybmFtZSI6ImFtaXIiLCJyb2xlIjoiRGV2ZWxvcGVyIiwicm9sZUlkIjo1LCJpYXQiOjE3NTMyNzMyMjIsImV4cCI6MTc1MzI3NjgyMn0.i-qqdQ0QmUu5xwZ7yCj2P0n7Zfc1JATqwPqbuV7YBYE	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0LCJ1c2VybmFtZSI6ImFtaXIiLCJyb2xlIjoiRGV2ZWxvcGVyIiwicm9sZUlkIjo1LCJpYXQiOjE3NTMyNzMyMjIsImV4cCI6MTc1Mzg3ODAyMn0.-cWH7x1L2Sr-Ylavp5iXExSfOeXO_9ZQ49wy3rO3ryU	2025-08-22 12:20:22.497+00	t	2025-07-23 12:20:22.497411+00	1	2025-07-23 12:20:22.497411+00	1	\N	\N
653	1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzI3MzQ4NCwiZXhwIjoxNzUzMjc3MDg0fQ.7B47nAtmFGUaWUraXMVWLR6VXVpPTwGBh8ZPEuAqHxc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1MzI3MzQ4NCwiZXhwIjoxNzUzODc4Mjg0fQ.IvSx31mo7LUAmVNvrugG5gmfeGssErEaguHv1UD6jxg	2025-08-22 12:24:44.604+00	t	2025-07-23 12:24:44.604651+00	1	2025-07-23 12:24:44.604651+00	1	\N	\N
654	24	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0LCJ1c2VybmFtZSI6ImFtaXIiLCJyb2xlIjoiRGV2ZWxvcGVyIiwicm9sZUlkIjo1LCJpYXQiOjE3NTMyNzY3NDYsImV4cCI6MTc1MzI4MDM0Nn0.VEwG4zJW4mKBK27pUSWxMrquFd3y5y3PgStCCwYrcNw	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0LCJ1c2VybmFtZSI6ImFtaXIiLCJyb2xlIjoiRGV2ZWxvcGVyIiwicm9sZUlkIjo1LCJpYXQiOjE3NTMyNzY3NDYsImV4cCI6MTc1Mzg4MTU0Nn0.t3j70F7ST7O5YF-HY_S3PWD9Z8i1Mqk-8iR49IGGpzw	2025-08-22 13:19:06.962+00	t	2025-07-23 13:19:06.962808+00	1	2025-07-23 13:19:06.962808+00	1	\N	\N
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, user_id, type, amount, balance_before, balance_after, currency, reference_id, external_reference, payment_method, status, description, metadata, created_at, created_by) FROM stdin;
1	2	deposit	100.00	0.00	100.00	USD	\N	\N	\N	completed	Initial deposit	\N	2025-07-03 03:27:34.361467+00	1
2	1	win	20.00	10000.00	10020.00	USD	\N	2165565	\N	completed	Provider win	\N	2025-07-13 03:12:41.639158+00	1
3	1	win	12.00	10020.00	10032.00	USD	\N	2165566	\N	completed	Provider win	\N	2025-07-13 03:12:42.189458+00	1
4	1	win	20.00	10032.00	10052.00	USD	\N	2165567	\N	completed	Provider win	\N	2025-07-13 03:12:51.339949+00	1
5	1	win	18.00	10052.00	10070.00	USD	\N	2165568	\N	completed	Provider win	\N	2025-07-13 03:12:51.917774+00	1
6	1	win	20.00	10070.00	10090.00	USD	\N	2165569	\N	completed	Provider win	\N	2025-07-13 03:13:11.65551+00	1
9	1	adjustment	0.00	10090.00	10090.00	USD	\N	2165570	\N	completed	Provider balance check (zero amount)	\N	2025-07-13 03:29:01.39123+00	1
10	1	win	15.00	10090.00	10105.00	USD	\N	2165571	\N	completed	Provider win	\N	2025-07-13 04:24:31.811306+00	1
11	1	adjustment	0.00	10105.00	10105.00	USD	\N	2165572	\N	completed	Provider balance check (zero amount)	\N	2025-07-13 04:24:32.383468+00	1
24	3	adjustment	0.00	0.00	0.00	USD	\N	\N	\N	completed	Initial balance setup	\N	2025-07-13 04:40:35.814584+00	1
25	4	adjustment	0.00	0.00	0.00	USD	\N	\N	\N	completed	Initial balance setup	\N	2025-07-13 04:40:35.814584+00	1
26	22	adjustment	0.00	0.00	0.00	USD	\N	\N	\N	completed	Initial balance setup	\N	2025-07-13 04:40:35.814584+00	1
27	23	adjustment	0.00	0.00	0.00	USD	\N	\N	\N	completed	Initial balance setup	\N	2025-07-13 04:40:35.814584+00	1
28	25	adjustment	0.00	0.00	0.00	USD	\N	\N	\N	completed	Initial balance setup	\N	2025-07-13 04:40:35.814584+00	1
29	26	adjustment	0.00	0.00	0.00	USD	\N	\N	\N	completed	Initial balance setup	\N	2025-07-13 04:40:35.814584+00	1
31	28	adjustment	0.00	0.00	0.00	USD	\N	\N	\N	completed	Initial balance setup	\N	2025-07-13 04:40:35.814584+00	1
32	29	adjustment	0.00	0.00	0.00	USD	\N	\N	\N	completed	Initial balance setup	\N	2025-07-13 04:40:35.814584+00	1
33	24	adjustment	0.00	0.00	0.00	USD	\N	\N	\N	completed	Initial balance setup	\N	2025-07-13 04:40:35.814584+00	1
34	30	adjustment	0.00	0.00	0.00	USD	\N	\N	\N	completed	Initial balance setup	\N	2025-07-13 04:40:35.814584+00	1
35	20	adjustment	0.00	0.00	0.00	USD	\N	\N	\N	completed	Initial balance setup	\N	2025-07-13 04:40:35.814584+00	1
30	27	adjustment	100000.00	0.00	0.00	USD	\N	\N	\N	completed	Initial balance setup	\N	2025-07-13 04:40:35.814584+00	1
53	1	bet	100.00	105.00	5.00	USD	\N	\N	\N	completed	Bet placed on game 53	{"game_id": 53, "game_data": {"bets": [{"chips": 100, "number": 17, "bet_type": "straight"}], "session_id": "roul-20250714-323"}}	2025-07-14 13:00:35.725371+00	1
54	1	bet	100.00	\N	\N	USD	\N	\N	\N	completed	Bet placed on game 53 (category: tablegame)	{"game_id": 53, "category": "tablegame", "game_data": {"bets": [{"chips": 100, "number": 17, "bet_type": "straight"}], "session_id": "roul-20250714-480"}}	2025-07-14 13:53:42.912461+00	1
55	1	bet	100.00	\N	\N	USD	\N	\N	\N	completed	Bet placed on game 53 (category: tablegame)	{"game_id": 53, "category": "tablegame", "game_data": {"bets": [{"chips": 100, "number": 17, "bet_type": "straight"}], "session_id": "roul-20250714-317"}}	2025-07-14 14:15:29.67014+00	1
56	1	win	0.10	\N	\N	USD	\N	2184238	\N	completed	Provider win	{"bet_id": null, "game_id": 42, "category": "slots", "provider_transaction_id": 2184238}	2025-07-22 05:49:59.937493+00	1
57	1	adjustment	0.00	\N	\N	USD	\N	2184239	\N	completed	Provider balance check (zero amount)	{"game_id": 42, "category": "slots", "provider_transaction_id": 2184239}	2025-07-22 05:50:00.489792+00	1
58	1	win	0.10	\N	\N	USD	\N	2184248	\N	completed	Provider win	{"bet_id": null, "game_id": 42, "category": "slots", "provider_transaction_id": 2184248}	2025-07-22 05:50:04.882042+00	1
59	1	win	0.50	\N	\N	USD	\N	2184249	\N	completed	Provider win	{"bet_id": null, "game_id": 42, "category": "slots", "provider_transaction_id": 2184249}	2025-07-22 05:50:05.416489+00	1
60	1	deposit	1000.00	\N	\N	USD	\N	\N	\N	completed	Admin top-up	\N	2025-07-22 05:50:58.41695+00	1
61	1	deposit	500.00	\N	\N	USD	\N	\N	\N	completed	Admin top-up	\N	2025-07-22 05:51:13.390811+00	1
62	1	win	0.10	\N	\N	USD	\N	2184350	\N	completed	Provider win	{"bet_id": null, "game_id": 42, "category": "slots", "provider_transaction_id": 2184350}	2025-07-22 05:52:10.132149+00	1
63	1	adjustment	0.00	\N	\N	USD	\N	2184351	\N	completed	Provider balance check (zero amount)	{"game_id": 42, "category": "slots", "provider_transaction_id": 2184351}	2025-07-22 05:52:10.67614+00	1
64	1	win	0.10	\N	\N	USD	\N	2187683	\N	completed	Provider win	{"bet_id": null, "game_id": 42, "category": "slots", "provider_transaction_id": 2187683}	2025-07-22 12:37:33.52304+00	1
65	1	adjustment	0.00	\N	\N	USD	\N	2187684	\N	completed	Provider balance check (zero amount)	{"game_id": 42, "category": "slots", "provider_transaction_id": 2187684}	2025-07-22 12:37:34.090136+00	1
66	1	win	0.20	\N	\N	USD	\N	2188036	\N	completed	Provider win	{"bet_id": null, "game_id": 4, "category": "slots", "provider_transaction_id": 2188036}	2025-07-22 13:17:48.53398+00	1
67	1	adjustment	0.00	\N	\N	USD	\N	2188037	\N	completed	Provider balance check (zero amount)	{"game_id": 4, "category": "slots", "provider_transaction_id": 2188037}	2025-07-22 13:17:49.102638+00	1
68	1	win	0.20	\N	\N	USD	\N	2188038	\N	completed	Provider win	{"bet_id": null, "game_id": 4, "category": "slots", "provider_transaction_id": 2188038}	2025-07-22 13:17:58.952429+00	1
69	1	adjustment	0.00	\N	\N	USD	\N	2188039	\N	completed	Provider balance check (zero amount)	{"game_id": 4, "category": "slots", "provider_transaction_id": 2188039}	2025-07-22 13:17:59.490313+00	1
70	1	win	0.20	\N	\N	USD	\N	2188041	\N	completed	Provider win	{"bet_id": null, "game_id": 4, "category": "slots", "provider_transaction_id": 2188041}	2025-07-22 13:21:33.480838+00	1
71	1	win	0.25	\N	\N	USD	\N	2188042	\N	completed	Provider win	{"bet_id": null, "game_id": 4, "category": "slots", "provider_transaction_id": 2188042}	2025-07-22 13:21:34.052285+00	1
72	1	win	0.10	\N	\N	USD	\N	2188072	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188072}	2025-07-22 14:02:51.218782+00	1
73	1	win	0.24	\N	\N	USD	\N	2188073	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188073}	2025-07-22 14:02:51.781514+00	1
74	1	win	0.10	\N	\N	USD	\N	2188074	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188074}	2025-07-22 14:02:54.227195+00	1
75	1	win	0.02	\N	\N	USD	\N	2188075	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188075}	2025-07-22 14:02:54.777364+00	1
76	1	win	0.10	\N	\N	USD	\N	2188076	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188076}	2025-07-22 14:02:57.356975+00	1
77	1	adjustment	0.00	\N	\N	USD	\N	2188077	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188077}	2025-07-22 14:02:57.953108+00	1
78	1	win	0.10	\N	\N	USD	\N	2188078	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188078}	2025-07-22 14:03:00.412769+00	1
79	1	win	0.16	\N	\N	USD	\N	2188079	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188079}	2025-07-22 14:03:00.962882+00	1
80	1	win	0.10	\N	\N	USD	\N	2188080	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188080}	2025-07-22 14:03:04.660094+00	1
81	1	adjustment	0.00	\N	\N	USD	\N	2188081	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188081}	2025-07-22 14:03:05.219153+00	1
82	1	win	0.10	\N	\N	USD	\N	2188082	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188082}	2025-07-22 14:03:11.940742+00	1
83	1	adjustment	0.00	\N	\N	USD	\N	2188083	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188083}	2025-07-22 14:03:12.505742+00	1
84	1	win	0.10	\N	\N	USD	\N	2188084	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188084}	2025-07-22 14:03:15.036102+00	1
85	1	adjustment	0.00	\N	\N	USD	\N	2188085	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188085}	2025-07-22 14:03:15.59522+00	1
86	1	win	0.10	\N	\N	USD	\N	2188086	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188086}	2025-07-22 14:03:18.110564+00	1
87	1	adjustment	0.00	\N	\N	USD	\N	2188087	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188087}	2025-07-22 14:03:18.695459+00	1
88	1	win	0.10	\N	\N	USD	\N	2188088	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188088}	2025-07-22 14:03:21.089604+00	1
89	1	adjustment	0.00	\N	\N	USD	\N	2188089	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188089}	2025-07-22 14:03:21.627839+00	1
90	1	win	0.10	\N	\N	USD	\N	2188090	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188090}	2025-07-22 14:03:59.180238+00	1
91	1	adjustment	0.00	\N	\N	USD	\N	2188091	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188091}	2025-07-22 14:03:59.743885+00	1
92	1	win	0.10	\N	\N	USD	\N	2188092	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188092}	2025-07-22 14:04:03.284962+00	1
93	1	adjustment	0.00	\N	\N	USD	\N	2188093	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188093}	2025-07-22 14:04:03.845447+00	1
94	1	win	0.50	\N	\N	USD	\N	2188094	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188094}	2025-07-22 14:04:23.394569+00	1
95	1	win	0.10	\N	\N	USD	\N	2188095	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188095}	2025-07-22 14:04:23.963375+00	1
96	1	win	0.10	\N	\N	USD	\N	2188096	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188096}	2025-07-22 14:04:29.078869+00	1
97	1	adjustment	0.00	\N	\N	USD	\N	2188097	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188097}	2025-07-22 14:04:29.634617+00	1
98	1	win	0.10	\N	\N	USD	\N	2188098	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188098}	2025-07-22 14:04:32.110895+00	1
99	1	adjustment	0.00	\N	\N	USD	\N	2188099	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188099}	2025-07-22 14:04:32.671645+00	1
100	1	win	0.10	\N	\N	USD	\N	2188100	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188100}	2025-07-22 14:04:35.106586+00	1
101	1	win	0.12	\N	\N	USD	\N	2188101	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188101}	2025-07-22 14:04:35.647419+00	1
102	1	win	0.10	\N	\N	USD	\N	2188102	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188102}	2025-07-22 14:04:38.271067+00	1
103	1	win	0.10	\N	\N	USD	\N	2188103	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188103}	2025-07-22 14:04:38.847299+00	1
104	1	win	0.10	\N	\N	USD	\N	2188104	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188104}	2025-07-22 14:04:42.399041+00	1
105	1	adjustment	0.00	\N	\N	USD	\N	2188105	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188105}	2025-07-22 14:04:42.973621+00	1
106	1	win	0.10	\N	\N	USD	\N	2188106	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188106}	2025-07-22 14:04:45.510509+00	1
107	1	adjustment	0.00	\N	\N	USD	\N	2188107	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188107}	2025-07-22 14:04:46.063236+00	1
108	1	win	0.10	\N	\N	USD	\N	2188108	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188108}	2025-07-22 14:04:48.141536+00	1
109	1	win	0.03	\N	\N	USD	\N	2188109	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188109}	2025-07-22 14:04:48.690846+00	1
110	1	win	0.10	\N	\N	USD	\N	2188110	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188110}	2025-07-22 14:04:51.100875+00	1
111	1	adjustment	0.00	\N	\N	USD	\N	2188111	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188111}	2025-07-22 14:04:51.339781+00	1
112	1	win	0.10	\N	\N	USD	\N	2188112	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188112}	2025-07-22 14:04:54.374164+00	1
113	1	win	0.03	\N	\N	USD	\N	2188113	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188113}	2025-07-22 14:04:54.601999+00	1
114	1	win	0.10	\N	\N	USD	\N	2188114	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188114}	2025-07-22 14:05:02.131749+00	1
115	1	win	0.03	\N	\N	USD	\N	2188115	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188115}	2025-07-22 14:05:02.6845+00	1
116	1	win	0.10	\N	\N	USD	\N	2188116	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188116}	2025-07-22 14:05:05.048031+00	1
117	1	win	0.15	\N	\N	USD	\N	2188117	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188117}	2025-07-22 14:05:05.629033+00	1
118	1	win	0.10	\N	\N	USD	\N	2188118	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188118}	2025-07-22 14:05:08.181619+00	1
119	1	adjustment	0.00	\N	\N	USD	\N	2188119	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188119}	2025-07-22 14:05:08.748144+00	1
120	1	win	0.10	\N	\N	USD	\N	2188120	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188120}	2025-07-22 14:05:10.8718+00	1
121	1	adjustment	0.00	\N	\N	USD	\N	2188121	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188121}	2025-07-22 14:05:11.097682+00	1
122	1	win	0.10	\N	\N	USD	\N	2188122	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188122}	2025-07-22 14:05:14.424475+00	1
123	1	adjustment	0.00	\N	\N	USD	\N	2188123	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188123}	2025-07-22 14:05:14.666533+00	1
124	1	win	0.10	\N	\N	USD	\N	2188124	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188124}	2025-07-22 14:05:17.218395+00	1
125	1	win	0.10	\N	\N	USD	\N	2188125	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188125}	2025-07-22 14:05:17.792176+00	1
126	1	win	0.10	\N	\N	USD	\N	2188126	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188126}	2025-07-22 14:05:20.400647+00	1
127	1	adjustment	0.00	\N	\N	USD	\N	2188127	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188127}	2025-07-22 14:05:20.949569+00	1
128	1	win	0.10	\N	\N	USD	\N	2188128	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188128}	2025-07-22 14:05:23.385663+00	1
129	1	adjustment	0.00	\N	\N	USD	\N	2188129	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188129}	2025-07-22 14:05:23.925625+00	1
130	1	win	0.10	\N	\N	USD	\N	2188130	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188130}	2025-07-22 14:05:33.264954+00	1
131	1	adjustment	0.00	\N	\N	USD	\N	2188131	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188131}	2025-07-22 14:05:33.507302+00	1
132	1	win	0.10	\N	\N	USD	\N	2188132	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188132}	2025-07-22 14:05:35.923905+00	1
133	1	adjustment	0.00	\N	\N	USD	\N	2188133	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188133}	2025-07-22 14:05:36.161297+00	1
134	1	win	0.10	\N	\N	USD	\N	2188134	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188134}	2025-07-22 14:05:48.715708+00	1
135	1	adjustment	0.00	\N	\N	USD	\N	2188135	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188135}	2025-07-22 14:05:48.962731+00	1
136	1	win	0.10	\N	\N	USD	\N	2188136	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188136}	2025-07-22 14:05:51.714023+00	1
137	1	win	0.05	\N	\N	USD	\N	2188137	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188137}	2025-07-22 14:05:51.977741+00	1
138	1	win	3.20	\N	\N	USD	\N	2188138	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188138}	2025-07-22 14:07:28.92464+00	1
139	1	win	0.10	\N	\N	USD	\N	2188139	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188139}	2025-07-22 14:07:30.575123+00	1
140	1	adjustment	0.00	\N	\N	USD	\N	2188140	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188140}	2025-07-22 14:07:31.12034+00	1
141	1	win	0.10	\N	\N	USD	\N	2188141	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188141}	2025-07-22 14:07:33.672583+00	1
142	1	adjustment	0.00	\N	\N	USD	\N	2188142	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188142}	2025-07-22 14:07:34.214295+00	1
143	1	win	0.10	\N	\N	USD	\N	2188143	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188143}	2025-07-22 14:07:37.550933+00	1
144	1	win	0.02	\N	\N	USD	\N	2188144	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188144}	2025-07-22 14:07:38.114424+00	1
145	1	win	0.10	\N	\N	USD	\N	2188145	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188145}	2025-07-22 14:07:40.60256+00	1
146	1	win	0.02	\N	\N	USD	\N	2188146	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188146}	2025-07-22 14:07:41.171438+00	1
147	1	win	0.10	\N	\N	USD	\N	2188147	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188147}	2025-07-22 14:07:43.786606+00	1
148	1	adjustment	0.00	\N	\N	USD	\N	2188148	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188148}	2025-07-22 14:07:44.336696+00	1
149	1	win	0.10	\N	\N	USD	\N	2188149	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188149}	2025-07-22 14:07:46.850184+00	1
150	1	win	0.62	\N	\N	USD	\N	2188150	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188150}	2025-07-22 14:07:47.416232+00	1
151	1	win	0.10	\N	\N	USD	\N	2188151	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188151}	2025-07-22 14:07:50.006386+00	1
152	1	adjustment	0.00	\N	\N	USD	\N	2188152	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188152}	2025-07-22 14:07:50.568513+00	1
153	1	win	0.10	\N	\N	USD	\N	2188154	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188154}	2025-07-22 14:07:54.785059+00	1
154	1	win	0.30	\N	\N	USD	\N	2188155	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188155}	2025-07-22 14:07:55.317153+00	1
155	1	win	0.10	\N	\N	USD	\N	2188156	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188156}	2025-07-22 14:07:56.748301+00	1
156	1	adjustment	0.00	\N	\N	USD	\N	2188157	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188157}	2025-07-22 14:07:57.316063+00	1
157	1	win	0.10	\N	\N	USD	\N	2188158	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188158}	2025-07-22 14:07:58.571796+00	1
158	1	adjustment	0.00	\N	\N	USD	\N	2188159	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188159}	2025-07-22 14:07:59.159373+00	1
159	1	win	0.10	\N	\N	USD	\N	2188161	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188161}	2025-07-22 14:09:52.871863+00	1
160	1	win	0.05	\N	\N	USD	\N	2188162	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188162}	2025-07-22 14:20:28.878404+00	1
161	2	win	0.10	\N	\N	USD	\N	2188166	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188166}	2025-07-22 14:34:53.260566+00	1
162	2	adjustment	0.00	\N	\N	USD	\N	2188167	\N	completed	Provider balance check (zero amount)	{"game_id": 40, "category": "slots", "provider_transaction_id": 2188167}	2025-07-22 14:34:53.806611+00	1
163	2	win	0.10	\N	\N	USD	\N	2188168	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188168}	2025-07-22 14:34:58.963179+00	1
164	2	win	0.02	\N	\N	USD	\N	2188169	\N	completed	Provider win	{"bet_id": null, "game_id": 40, "category": "slots", "provider_transaction_id": 2188169}	2025-07-22 14:34:59.5374+00	1
165	1	win	0.20	\N	\N	USD	\N	2188173	\N	completed	Provider win	{"bet_id": null, "game_id": 4, "category": "slots", "provider_transaction_id": 2188173}	2025-07-22 16:04:10.903998+00	1
166	1	adjustment	0.00	\N	\N	USD	\N	2188174	\N	completed	Provider balance check (zero amount)	{"game_id": 4, "category": "slots", "provider_transaction_id": 2188174}	2025-07-22 16:04:11.452423+00	1
167	1	win	0.20	\N	\N	USD	\N	2188287	\N	completed	Provider win	{"bet_id": null, "game_id": 46, "category": "slots", "provider_transaction_id": 2188287}	2025-07-22 16:06:20.505546+00	1
168	1	adjustment	0.00	\N	\N	USD	\N	2188288	\N	completed	Provider balance check (zero amount)	{"game_id": 46, "category": "slots", "provider_transaction_id": 2188288}	2025-07-22 16:06:21.099056+00	1
169	1	win	0.20	\N	\N	USD	\N	2188293	\N	completed	Provider win	{"bet_id": null, "game_id": 4, "category": "slots", "provider_transaction_id": 2188293}	2025-07-22 16:08:27.891943+00	1
170	1	win	0.20	\N	\N	USD	\N	2188294	\N	completed	Provider win	{"bet_id": null, "game_id": 4, "category": "slots", "provider_transaction_id": 2188294}	2025-07-22 16:08:28.457074+00	1
171	1	win	0.20	\N	\N	USD	\N	2188301	\N	completed	Provider win	{"bet_id": null, "game_id": 4, "category": "slots", "provider_transaction_id": 2188301}	2025-07-22 16:17:52.583921+00	1
172	1	win	0.05	\N	\N	USD	\N	2188302	\N	completed	Provider win	{"bet_id": null, "game_id": 4, "category": "slots", "provider_transaction_id": 2188302}	2025-07-22 16:17:53.141386+00	1
173	1	win	0.20	\N	\N	USD	\N	2188303	\N	completed	Provider win	{"bet_id": null, "game_id": 51, "category": "slots", "provider_transaction_id": 2188303}	2025-07-22 16:22:29.578742+00	1
174	1	adjustment	0.00	\N	\N	USD	\N	2188304	\N	completed	Provider balance check (zero amount)	{"game_id": 51, "category": "slots", "provider_transaction_id": 2188304}	2025-07-22 16:22:30.145565+00	1
175	1	win	0.20	\N	\N	USD	\N	2189205	\N	completed	Provider win	{"bet_id": null, "game_id": 4, "category": "slots", "provider_transaction_id": 2189205}	2025-07-22 19:23:02.416065+00	1
176	1	win	0.75	\N	\N	USD	\N	2189206	\N	completed	Provider win	{"bet_id": null, "game_id": 4, "category": "slots", "provider_transaction_id": 2189206}	2025-07-22 19:23:02.655513+00	1
\.


--
-- Data for Name: user_activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_activity_logs (id, user_id, action, category, description, ip_address, user_agent, session_id, metadata, created_at, created_by) FROM stdin;
1	2	login	authentication	User logged in successfully	192.168.1.1	\N	\N	\N	2025-07-03 03:27:34.361467+00	1
2	2	place_bet	gaming	Placed bet on Book of Dead	192.168.1.1	\N	\N	\N	2025-07-03 03:27:34.361467+00	1
3	2	login	auth	User logged in	2001:e68:542f:645a:c5e9:7916:cf6b:dd1a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-03 14:55:41.332585+00	1
4	2	login	auth	User logged in	2001:e68:542f:645a:c5e9:7916:cf6b:dd1a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-03 14:56:19.063395+00	1
5	2	login	auth	User logged in	2001:e68:542f:645a:c5e9:7916:cf6b:dd1a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-03 16:03:19.194885+00	1
6	2	login	auth	User logged in	2001:e68:542f:645a:c5e9:7916:cf6b:dd1a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-03 16:14:59.780297+00	1
7	2	login	auth	User logged in	2001:e68:542f:645a:c5e9:7916:cf6b:dd1a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-03 16:21:34.192906+00	1
8	2	login	auth	User logged in	2001:e68:542f:645a:c5e9:7916:cf6b:dd1a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-03 16:44:14.566861+00	1
9	2	login	auth	User logged in	2001:e68:542f:645a:c5e9:7916:cf6b:dd1a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-03 16:49:06.978765+00	1
10	2	login	auth	User logged in	2001:e68:542f:645a:c5e9:7916:cf6b:dd1a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-03 16:54:40.99745+00	1
11	2	login	auth	User logged in	2001:e68:542f:645a:c5e9:7916:cf6b:dd1a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-03 16:55:09.309824+00	1
12	2	login	auth	User logged in	2001:e68:542f:645a:c5e9:7916:cf6b:dd1a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-03 17:01:14.48746+00	1
13	2	login	auth	User logged in	2001:e68:542f:645a:c5e9:7916:cf6b:dd1a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-03 17:05:39.322608+00	1
14	2	login	auth	User logged in	2001:e68:542f:645a:c5e9:7916:cf6b:dd1a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-03 17:43:42.042989+00	1
15	2	login	auth	User logged in	202.186.82.50	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-04 06:41:57.215859+00	1
16	2	login	auth	User logged in	202.186.82.50	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-04 08:25:11.408005+00	1
17	2	login	auth	User logged in	202.186.82.50	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-04 08:25:25.820733+00	1
18	2	login	auth	User logged in	202.186.82.50	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-04 08:25:34.747739+00	1
19	2	login	auth	User logged in	202.186.82.50	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-04 08:26:22.528565+00	1
20	2	login	auth	User logged in	202.186.82.50	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-04 08:28:42.291801+00	1
21	2	login	auth	User logged in	202.186.82.50	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-04 08:30:12.950597+00	1
22	2	login	auth	User logged in	202.186.82.50	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-04 08:37:35.914576+00	1
23	2	login	auth	User logged in	202.186.82.50	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-04 08:40:21.495115+00	1
24	4	register	auth	User registered	\N	\N	\N	{"email": "jackpotx@email.com", "username": "jackpotx@email.com", "registration_method": "email"}	2025-07-04 18:17:58.444107+00	1
25	4	login	auth	User logged in	2001:f40:97c:aca8:ecec:abce:bcf:ca3e	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-04 18:41:45.250946+00	1
26	4	login	auth	User logged in	2001:f40:97c:aca8:ecec:abce:bcf:ca3e	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-04 18:42:39.360984+00	1
27	4	login	auth	User logged in	2001:f40:97c:aca8:ecec:abce:bcf:ca3e	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-04 18:44:33.463871+00	1
28	4	login	auth	User logged in	2001:f40:97c:aca8:ecec:abce:bcf:ca3e	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-04 18:45:05.351866+00	1
29	4	login	auth	User logged in	2001:f40:97c:aca8:ecec:abce:bcf:ca3e	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-04 18:45:37.505651+00	1
30	4	login	auth	User logged in	2001:f40:97c:aca8:ecec:abce:bcf:ca3e	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-04 18:46:36.446832+00	1
31	4	login	auth	User logged in	2001:f40:97c:aca8:ecec:abce:bcf:ca3e	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-04 21:42:53.109617+00	1
32	4	login	auth	User logged in	2001:f40:97c:aca8:ecec:abce:bcf:ca3e	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-04 21:44:02.297989+00	1
33	2	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 01:04:18.184363+00	1
34	20	register	auth	User registered	\N	\N	\N	{"email": "newuser@email.com", "username": "player3", "registration_method": "email"}	2025-07-05 02:03:34.735386+00	1
35	2	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 03:53:45.080899+00	1
36	22	register	auth	User registered	\N	\N	\N	{"email": "newuser4@email.com", "username": "player4", "qr_generated": true, "registration_method": "email"}	2025-07-05 04:42:58.449756+00	1
37	22	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 04:52:01.296196+00	1
38	22	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 04:52:17.717369+00	1
39	22	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 04:52:20.597665+00	1
40	22	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 04:52:22.843589+00	1
41	22	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 04:52:24.820684+00	1
42	22	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 04:52:30.576658+00	1
43	22	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 04:52:32.950156+00	1
44	22	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 04:53:29.20239+00	1
45	22	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 04:53:57.421242+00	1
46	22	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 04:56:32.085337+00	1
47	22	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 04:57:15.338942+00	1
48	22	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 05:01:29.049582+00	1
49	22	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 05:02:51.114045+00	1
82	23	register	auth	User registered	\N	\N	\N	{"email": "newuser1@email.com", "username": "newuser1", "qr_generated": true, "registration_method": "email"}	2025-07-05 11:59:21.053628+00	1
83	23	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 12:10:09.35771+00	1
84	23	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-05 12:10:39.255017+00	1
85	23	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 12:37:33.850411+00	1
86	23	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 12:41:18.550951+00	1
87	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 12:42:15.068936+00	1
88	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 13:04:06.423784+00	1
89	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 13:06:32.016223+00	1
90	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 13:27:50.190966+00	1
91	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 14:34:32.892334+00	1
92	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 14:45:48.508968+00	1
93	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 15:06:01.787891+00	1
94	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 15:15:32.486752+00	1
95	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 15:33:21.283898+00	1
96	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 15:49:27.262847+00	1
97	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "provider": "iconix", "game_code": "46", "game_name": "American Roulette"}	2025-07-07 15:53:25.409883+00	1
98	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "provider": "iconix", "game_code": "46", "game_name": "American Roulette"}	2025-07-07 15:59:18.590559+00	1
99	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 16:06:15.359546+00	1
100	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=9f6e35b9444a0c4771539f7b3ba9fdba&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "9f6e35b9444a0c4771539f7b3ba9fdba"}	2025-07-07 16:07:53.987507+00	1
101	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=0f963dceea54d2bb67d73e3e6e5a2982&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "0f963dceea54d2bb67d73e3e6e5a2982"}	2025-07-07 16:08:03.087568+00	1
102	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=bcca7616eeb65eee55afac65ab0ec720&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "bcca7616eeb65eee55afac65ab0ec720"}	2025-07-07 16:10:05.439723+00	1
103	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=62f9c4347105e47f7e36ce5c9dc6ea10&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "62f9c4347105e47f7e36ce5c9dc6ea10"}	2025-07-07 16:11:19.419357+00	1
104	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=d036f5bab146c47e1ef5b088a0b4ec83&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "d036f5bab146c47e1ef5b088a0b4ec83"}	2025-07-07 16:15:26.373799+00	1
105	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=725954459ad965b0eb6e67b307ea69fe&currency=USD&language=en&operator_id=thinkcode_stg&home_url=http%3A%2F%2F54.169.105.223", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "725954459ad965b0eb6e67b307ea69fe"}	2025-07-07 16:18:14.934435+00	1
106	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 16:28:37.239856+00	1
107	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=6093e0d0c21584825c371ae2e5fe60be&currency=USD&language=en&operator_id=thinkcode_stg&home_url=http%3A%2F%2F54.169.105.223", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "6093e0d0c21584825c371ae2e5fe60be"}	2025-07-07 16:29:06.2317+00	1
108	1	login	auth	User logged in	54.169.105.223	curl/7.88.1	\N	\N	2025-07-07 16:33:37.277975+00	1
109	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=6380063e8f0cd9e6cd419c882d29c907&currency=USD&language=en&operator_id=thinkcode_stg&home_url=http%3A%2F%2F54.169.105.223", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "6380063e8f0cd9e6cd419c882d29c907"}	2025-07-07 16:33:45.593999+00	1
110	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=d02ca578791698b388881da057590603&currency=USD&language=en&operator_id=thinkcode_stg&home_url=http%3A%2F%2F54.169.105.223", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "d02ca578791698b388881da057590603"}	2025-07-07 16:35:02.364773+00	1
111	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=c0f1b11195f15a2b090a6154443d0c3a&currency=USD&language=en&operator_id=thinkcode_stg&home_url=http%3A%2F%2F54.169.105.223", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "c0f1b11195f15a2b090a6154443d0c3a"}	2025-07-07 16:35:53.950542+00	1
112	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=4cf0427b4b7ef441019a672a00114e51&currency=USD&language=en&operator_id=thinkcode_stg&home_url=http%3A%2F%2F54.169.105.223", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "4cf0427b4b7ef441019a672a00114e51"}	2025-07-07 16:36:54.362027+00	1
113	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 16:48:47.895568+00	1
114	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=c432dc00036faa350bd2fe1c73466414&currency=USD&language=en&operator_id=thinkcode_stg&home_url=http%3A%2F%2F54.169.105.223", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "c432dc00036faa350bd2fe1c73466414"}	2025-07-07 16:49:06.089646+00	1
115	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=6fc07c0078725a73beff575a46a79150&currency=USD&language=en&operator_id=thinkcode_stg&home_url=http%3A%2F%2F54.169.105.223", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "6fc07c0078725a73beff575a46a79150"}	2025-07-07 16:49:40.776445+00	1
116	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=c3355bc68cf086ea3d0679ffd31f40a4&currency=USD&language=en&operator_id=thinkcode_stg&home_url=http%3A%2F%2F54.169.105.223", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "c3355bc68cf086ea3d0679ffd31f40a4"}	2025-07-07 16:49:42.994632+00	1
117	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=7b6974b2dabd408c91769f1ca6573e92&currency=USD&language=en&operator_id=thinkcode_stg&home_url=http%3A%2F%2F54.169.105.223", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "7b6974b2dabd408c91769f1ca6573e92"}	2025-07-07 16:49:47.521944+00	1
118	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=92480a66a09d566b21989f72162ceda4&currency=USD&language=en&operator_id=thinkcode_stg&home_url=http%3A%2F%2F54.169.105.223", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "92480a66a09d566b21989f72162ceda4"}	2025-07-07 16:49:48.24701+00	1
119	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=076ed0ee94e1d176b07bf89bdfb49fd3&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "076ed0ee94e1d176b07bf89bdfb49fd3"}	2025-07-07 16:52:12.840067+00	1
120	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=2c546a8a13a4a893179ec71215309954&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "2c546a8a13a4a893179ec71215309954"}	2025-07-07 16:53:31.554887+00	1
121	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=655f7e9a86d5d964ab882442bd1b999a&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "655f7e9a86d5d964ab882442bd1b999a"}	2025-07-07 16:55:23.47697+00	1
122	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 16:57:28.51676+00	1
123	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=8c08a02c6b7901d9d064298fece96099&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "8c08a02c6b7901d9d064298fece96099"}	2025-07-07 16:57:58.335641+00	1
124	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=27448d0cbb77b1635f57a7bf85f1bc94&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "27448d0cbb77b1635f57a7bf85f1bc94"}	2025-07-07 16:59:17.474187+00	1
174	26	register	auth	User registered	\N	\N	\N	{"email": "arsalan@gmail.com", "username": "arsalan@gmail.com", "qr_generated": true, "registration_method": "email"}	2025-07-09 15:12:12.385975+00	1
125	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=be34e0864f3aa36c7c6ce89498efb5b9&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "be34e0864f3aa36c7c6ce89498efb5b9"}	2025-07-07 17:00:15.808009+00	1
126	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 17:03:39.069717+00	1
127	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=57599b08e2289e4f0e4acd5aec6b8dad&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "57599b08e2289e4f0e4acd5aec6b8dad"}	2025-07-07 17:04:09.257021+00	1
128	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=325d9c482ad1ae12a134e0c35d2445a4&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "325d9c482ad1ae12a134e0c35d2445a4"}	2025-07-07 17:05:47.055668+00	1
129	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=8e5f8b0fe522100d6b7c618962e80eb3&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "8e5f8b0fe522100d6b7c618962e80eb3"}	2025-07-07 17:07:33.146323+00	1
130	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=c30c3e94d8107f35f733b78c16a2f14e&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "c30c3e94d8107f35f733b78c16a2f14e"}	2025-07-07 17:08:23.69235+00	1
131	1	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=49fa4794fd8272b1b9fc91161d48ef4f&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_token": "49fa4794fd8272b1b9fc91161d48ef4f"}	2025-07-07 17:11:07.995529+00	1
132	1	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=e1f7d8a412a606a9b5ff44dae2826ad4&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_token": "e1f7d8a412a606a9b5ff44dae2826ad4"}	2025-07-07 17:13:11.581113+00	1
133	1	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=dd8ed83c6cc0c81b04c0603c460cf84b&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_token": "dd8ed83c6cc0c81b04c0603c460cf84b"}	2025-07-07 17:15:27.914439+00	1
134	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 17:21:38.044805+00	1
135	1	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=c92be1c1213affa088afe1f02b9829e6&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_token": "c92be1c1213affa088afe1f02b9829e6"}	2025-07-07 17:21:56.630968+00	1
136	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 17:31:33.172973+00	1
137	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=5db3d8700afa1b516c59e6a07b5450d0&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_token": "5db3d8700afa1b516c59e6a07b5450d0"}	2025-07-07 17:31:56.294788+00	1
138	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=ae9acc0f07f09341fb9a41c8cfc01fbe&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_token": "ae9acc0f07f09341fb9a41c8cfc01fbe"}	2025-07-07 17:34:25.706488+00	1
139	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=2b2951b39c72cf81f24fdd1a072bd64a&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_token": "2b2951b39c72cf81f24fdd1a072bd64a"}	2025-07-07 17:35:52.569497+00	1
140	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=34d78acbfc723c10aaf9a9b3d87d5f0b&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_token": "34d78acbfc723c10aaf9a9b3d87d5f0b"}	2025-07-07 17:46:30.383964+00	1
141	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 17:47:32.484982+00	1
142	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=28476f3df49ea0364da14f9955d8055b&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_token": "28476f3df49ea0364da14f9955d8055b"}	2025-07-07 17:47:58.299192+00	1
143	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=addc8dc12a8060e9dcd9f03a437f5d9b&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_token": "addc8dc12a8060e9dcd9f03a437f5d9b"}	2025-07-07 17:48:00.222344+00	1
144	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 17:50:37.303379+00	1
145	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=99c623e7fd795b0427ff16be1ef66216&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_token": "99c623e7fd795b0427ff16be1ef66216"}	2025-07-07 17:51:00.268753+00	1
146	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 18:00:18.668066+00	1
147	1	login	auth	User logged in	2001:e68:542f:645a:d08c:bda2:e734:67f3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-07 18:00:23.264518+00	1
148	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=cf9e38b84d49c3b9fa6dc86056d99676&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_token": "cf9e38b84d49c3b9fa6dc86056d99676"}	2025-07-07 18:00:52.228746+00	1
149	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=f81a04ed08aebab814e72baf0466f3f4&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_token": "f81a04ed08aebab814e72baf0466f3f4"}	2025-07-07 18:03:28.307854+00	1
150	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=d87e3f5a57326c0f9e40cfe806d06614&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_token": "d87e3f5a57326c0f9e40cfe806d06614"}	2025-07-07 18:06:01.484816+00	1
151	1	login	auth	User logged in	202.186.82.50	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-08 02:03:17.836693+00	1
152	1	login	auth	User logged in	202.186.82.50	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-08 02:25:29.267716+00	1
153	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=8c9f95ed4707861007d3587947cabee3&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_token": "8c9f95ed4707861007d3587947cabee3"}	2025-07-08 02:25:45.6806+00	1
154	1	login	auth	User logged in	202.186.82.50	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-09 08:56:53.7882+00	1
155	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=45d0ea88d19712e7df5fccde60d7bd23&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_token": "45d0ea88d19712e7df5fccde60d7bd23"}	2025-07-09 08:57:17.95875+00	1
156	1	login	auth	User logged in	2001:e68:542f:645a:90b9:d306:157c:e859	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-09 11:01:29.702497+00	1
157	1	login	auth	User logged in	2001:d08:2306:b6a2:4d15:bc98:ab4a:82f1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-09 11:01:43.894467+00	1
158	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=c4252cd0877aa804ec14642064db610c&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "c4252cd0877aa804ec14642064db610c"}	2025-07-09 11:04:57.554051+00	1
159	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=aadb8af0aa5e45fc1cc482f5a9081588&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "aadb8af0aa5e45fc1cc482f5a9081588"}	2025-07-09 11:05:04.50861+00	1
160	24	register	auth	User registered	\N	\N	\N	{"email": "newuser222@email.com", "username": "newuser", "qr_generated": true, "registration_method": "email"}	2025-07-09 11:32:12.993721+00	1
161	1	login	auth	User logged in	2001:e68:542f:645a:90b9:d306:157c:e859	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-09 12:36:33.749693+00	1
162	1	login	auth	User logged in	2001:e68:542f:645a:90b9:d306:157c:e859	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-09 12:43:07.390593+00	1
163	1	login	auth	User logged in	2001:e68:542f:645a:90b9:d306:157c:e859	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-09 12:43:42.499999+00	1
164	1	login	auth	User logged in	2001:e68:542f:645a:90b9:d306:157c:e859	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-09 13:13:11.187908+00	1
165	24	login	auth	User logged in	2001:d08:1038:32db:b573:bb7e:9083:3fed	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-09 13:47:22.649633+00	1
166	24	login	auth	User logged in	2001:d08:1038:32db:b573:bb7e:9083:3fed	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-09 13:57:54.454949+00	1
167	1	login	auth	User logged in	2001:e68:542f:645a:90b9:d306:157c:e859	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-09 13:59:12.050459+00	1
168	24	login	auth	User logged in	2001:d08:1038:32db:b573:bb7e:9083:3fed	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-09 14:00:56.490968+00	1
169	1	login	auth	User logged in	2001:e68:542f:645a:90b9:d306:157c:e859	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-09 14:06:48.105839+00	1
170	1	login	auth	User logged in	2001:d08:1038:32db:b573:bb7e:9083:3fed	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-09 14:07:21.378023+00	1
171	1	login	auth	User logged in	2001:e68:542f:645a:90b9:d306:157c:e859	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-09 14:14:19.343734+00	1
172	1	login	auth	User logged in	2001:e68:542f:645a:90b9:d306:157c:e859	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-09 15:03:05.314199+00	1
173	25	register	auth	User registered	\N	\N	\N	{"email": "arsalan@gmail.com", "username": "arsalan@gmail.com", "qr_generated": true, "registration_method": "email"}	2025-07-09 15:11:12.839679+00	1
175	27	register	auth	User registered	\N	\N	\N	{"email": "aaa@gmail.com", "username": "aaa@gmail.com", "qr_generated": true, "registration_method": "email"}	2025-07-09 15:18:36.113158+00	1
176	28	register	auth	User registered	\N	\N	\N	{"email": "abcd@gmail.com", "username": "abcd@gmail.com", "qr_generated": true, "registration_method": "email"}	2025-07-09 15:23:18.966678+00	1
177	1	login	auth	User logged in	2001:e68:542f:645a:90b9:d306:157c:e859	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-09 15:42:02.266193+00	1
178	1	login	auth	User logged in	2001:e68:542f:645a:6df2:9819:def9:20bb	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-10 11:12:27.897042+00	1
179	1	login	auth	User logged in	2001:e68:542f:645a:6df2:9819:def9:20bb	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-10 11:14:07.813817+00	1
180	24	login	auth	User logged in	2001:e68:542f:645a:6df2:9819:def9:20bb	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-10 11:15:43.008809+00	1
181	24	login	auth	User logged in	2001:e68:542f:645a:6df2:9819:def9:20bb	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-10 11:16:15.292199+00	1
182	1	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 11:34:58.294242+00	1
183	24	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 11:38:59.829468+00	1
184	24	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 11:39:56.625222+00	1
185	24	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 11:45:47.416389+00	1
186	24	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 11:46:21.082922+00	1
187	24	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 11:46:48.996041+00	1
188	24	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 11:48:41.79393+00	1
189	24	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 11:50:47.680574+00	1
190	24	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 11:55:12.628938+00	1
191	24	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 11:58:38.459255+00	1
192	29	register	auth	User registered	\N	\N	\N	{"email": "test@gmail.com", "username": "test12", "qr_generated": true, "registration_method": "email"}	2025-07-10 12:12:44.019906+00	1
193	24	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 12:20:50.021434+00	1
194	24	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 12:55:10.101894+00	1
195	24	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 13:17:42.142537+00	1
196	1	login	auth	User logged in	2001:e68:542f:645a:6df2:9819:def9:20bb	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-10 13:55:18.650377+00	1
197	24	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 14:35:51.928459+00	1
198	1	login	auth	User logged in	2001:e68:542f:645a:6df2:9819:def9:20bb	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-10 14:43:27.635303+00	1
199	24	login	auth	User logged in	2001:d08:1038:32db:9cf0:159f:2e76:1d6c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-10 16:22:15.654006+00	1
200	1	login	auth	User logged in	202.186.85.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 01:57:01.734319+00	1
201	1	login	auth	User logged in	202.186.85.42	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-11 02:10:54.323308+00	1
202	1	login	auth	User logged in	202.186.85.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 05:19:05.991887+00	1
203	1	login	auth	User logged in	202.186.85.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 07:08:52.480587+00	1
204	24	login	auth	User logged in	2001:d08:2187:eb2c:cf1:ea96:6f18:a40d	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-11 10:46:21.808665+00	1
205	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 11:36:42.295119+00	1
206	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 11:41:25.83674+00	1
207	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 14:06:48.973358+00	1
208	24	login	auth	User logged in	2001:d08:2089:4f2a:fc05:615b:cefa:80fa	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-11 14:30:51.104477+00	1
209	24	login	auth	User logged in	2001:d08:2089:4f2a:fc05:615b:cefa:80fa	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-11 14:31:22.59306+00	1
210	24	login	auth	User logged in	2001:d08:2089:4f2a:fc05:615b:cefa:80fa	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-11 14:31:36.744595+00	1
211	24	login	auth	User logged in	2001:d08:2089:4f2a:fc05:615b:cefa:80fa	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-11 14:40:13.079895+00	1
212	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 14:44:13.354743+00	1
213	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 14:44:31.271769+00	1
214	24	login	auth	User logged in	2001:d08:2089:4f2a:fc05:615b:cefa:80fa	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-11 14:49:47.524801+00	1
215	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 14:55:59.268401+00	1
216	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 15:07:18.444147+00	1
217	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 15:07:50.121671+00	1
218	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 15:07:55.928464+00	1
219	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 15:15:45.919144+00	1
220	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 15:16:03.207123+00	1
221	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 15:16:07.952087+00	1
222	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 15:16:11.040831+00	1
223	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 15:41:17.52545+00	1
224	1	login	auth	User logged in	2001:d08:2089:4f2a:fc05:615b:cefa:80fa	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-11 15:42:25.106723+00	1
225	24	login	auth	User logged in	2001:d08:2089:4f2a:fc05:615b:cefa:80fa	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-11 15:46:24.337173+00	1
226	24	login	auth	User logged in	2001:d08:2089:4f2a:fc05:615b:cefa:80fa	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-11 16:07:51.839663+00	1
227	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 16:16:52.717534+00	1
228	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 16:17:55.970774+00	1
229	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 16:30:23.881729+00	1
230	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 16:35:25.305331+00	1
231	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 17:09:17.406599+00	1
232	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 17:09:41.68208+00	1
233	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 17:09:56.556695+00	1
234	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 17:10:10.716797+00	1
235	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 17:10:19.956437+00	1
236	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 17:10:40.918142+00	1
237	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 17:10:57.599188+00	1
238	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 17:19:23.109611+00	1
239	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 17:50:23.589972+00	1
240	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 17:50:36.052521+00	1
241	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 17:51:08.443458+00	1
242	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-11 17:51:22.48736+00	1
243	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-12 03:57:31.744097+00	1
244	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 05:36:06.175105+00	1
245	1	login	auth	User logged in	115.164.189.24	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/137.0.7151.79 Mobile/15E148 Safari/604.1	\N	\N	2025-07-12 05:40:32.902243+00	1
246	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=e5cf5795018c24e3ac1424bf1edab7c9&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "e5cf5795018c24e3ac1424bf1edab7c9"}	2025-07-12 05:41:30.211995+00	1
247	1	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=924a42cfa7e698d211ed70dd3cd1f5ca&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_token": "924a42cfa7e698d211ed70dd3cd1f5ca"}	2025-07-12 05:43:05.145136+00	1
248	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 05:52:23.945678+00	1
249	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 06:09:33.867451+00	1
250	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=8777895770edf98c9d089170bbc08318&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_token": "8777895770edf98c9d089170bbc08318"}	2025-07-12 06:17:28.005954+00	1
251	24	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=35c255a31240495b96df540beb055adb&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_token": "35c255a31240495b96df540beb055adb"}	2025-07-12 06:17:55.052885+00	1
252	24	launch_game	gaming	Launched Kunoichi	\N	\N	\N	{"game_id": 52, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=42&token=5dbd4e02bbea0f74fa83d0311b1f2ad9&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "42", "game_name": "Kunoichi", "session_token": "5dbd4e02bbea0f74fa83d0311b1f2ad9"}	2025-07-12 06:18:59.491029+00	1
253	24	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=4ad012035b0ded78e05692e7056c83eb&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_token": "4ad012035b0ded78e05692e7056c83eb"}	2025-07-12 06:23:24.929878+00	1
254	24	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=7807bbab1c7782c921afa19f779c38fd&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_token": "7807bbab1c7782c921afa19f779c38fd"}	2025-07-12 06:23:37.407626+00	1
255	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=497e79ef2b778898b3dba2a8fb6ad99f&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "497e79ef2b778898b3dba2a8fb6ad99f"}	2025-07-12 06:23:52.394623+00	1
256	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 06:24:20.739354+00	1
257	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=8f137c9a34fe54f3bd638fe2415a3e4c&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_token": "8f137c9a34fe54f3bd638fe2415a3e4c"}	2025-07-12 06:24:25.993521+00	1
258	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=825d57d7439d27d522f87dc8ad8c89aa&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_token": "825d57d7439d27d522f87dc8ad8c89aa"}	2025-07-12 06:24:38.179799+00	1
259	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=e4ad08f34839083ad00ee31129fec037&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_token": "e4ad08f34839083ad00ee31129fec037"}	2025-07-12 06:25:05.467693+00	1
260	24	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=9a6928e5a3982f4eeb7df4f549c2f897&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_token": "9a6928e5a3982f4eeb7df4f549c2f897"}	2025-07-12 06:26:28.908995+00	1
261	24	launch_game	gaming	Launched Rocketman	\N	\N	\N	{"game_id": 59, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=256&token=f226fdd236fbc3c335c67b83b1e8ae16&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "256", "game_name": "Rocketman", "session_token": "f226fdd236fbc3c335c67b83b1e8ae16"}	2025-07-12 06:26:57.682913+00	1
262	24	launch_game	gaming	Launched Legend Of Emerald	\N	\N	\N	{"game_id": 50, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=34&token=9ad2109ff0fac26635f835e72b93c015&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "34", "game_name": "Legend Of Emerald", "session_token": "9ad2109ff0fac26635f835e72b93c015"}	2025-07-12 06:28:10.95305+00	1
263	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=be08fb30c822fd1c8ceb77ac6d21638e&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_token": "be08fb30c822fd1c8ceb77ac6d21638e"}	2025-07-12 06:28:22.713254+00	1
264	24	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=68b8ff71dee163421462141c7b5f46be&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_token": "68b8ff71dee163421462141c7b5f46be"}	2025-07-12 06:29:51.119+00	1
265	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=53449ff333ea70636a80905e70fcc3b9&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "53449ff333ea70636a80905e70fcc3b9"}	2025-07-12 06:32:11.424326+00	1
266	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 06:55:37.389807+00	1
267	24	launch_game	gaming	Launched Kunoichi	\N	\N	\N	{"game_id": 52, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=42&token=5471d4ba39f9ab18dba26646f8dab496&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "42", "game_name": "Kunoichi", "session_token": "5471d4ba39f9ab18dba26646f8dab496"}	2025-07-12 06:55:42.599627+00	1
268	24	launch_game	gaming	Launched Sakura	\N	\N	\N	{"game_id": 45, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=18&token=27425bb7114ed0b9bb412b1023e78c7e&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "18", "game_name": "Sakura", "session_token": "27425bb7114ed0b9bb412b1023e78c7e"}	2025-07-12 06:56:09.529763+00	1
269	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=6d969b6fc936a586345417b425b315ce&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_token": "6d969b6fc936a586345417b425b315ce"}	2025-07-12 06:56:29.253739+00	1
270	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=8ef116ca110b1b5e87bd96c64de7d7ea&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_token": "8ef116ca110b1b5e87bd96c64de7d7ea"}	2025-07-12 06:56:33.639705+00	1
271	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=9db30a93d58e6e3fec311170c2af45ed&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "9db30a93d58e6e3fec311170c2af45ed"}	2025-07-12 06:56:44.921191+00	1
272	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 07:23:48.784089+00	1
273	24	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=17da1e04823c672f2d7f7f35f7cd5770&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_token": "17da1e04823c672f2d7f7f35f7cd5770"}	2025-07-12 07:23:56.962654+00	1
274	24	launch_game	gaming	Launched VIP American Roulette	\N	\N	\N	{"game_id": 54, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=47&token=21117d8b6d6ee070eae3ba13ae8c59ac&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "47", "game_name": "VIP American Roulette", "session_token": "21117d8b6d6ee070eae3ba13ae8c59ac"}	2025-07-12 07:24:30.80703+00	1
275	30	register	auth	User registered	\N	\N	\N	{"email": "thinkcode0215@gmail.com", "username": "thinkcode", "qr_generated": true, "registration_method": "email"}	2025-07-12 07:33:09.54405+00	1
276	30	login	auth	User logged in	5.12.125.116	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-12 07:33:13.684323+00	1
277	30	login	auth	User logged in	5.12.125.116	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-12 07:33:20.470781+00	1
278	30	login	auth	User logged in	5.12.125.116	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-12 07:47:42.009083+00	1
279	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 07:55:32.506535+00	1
280	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 08:24:08.113644+00	1
281	1	login	auth	User logged in	175.141.13.55	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-12 08:40:41.071814+00	1
282	1	login	auth	User logged in	81.196.253.99	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-12 08:46:26.086389+00	1
283	1	login	auth	User logged in	81.196.253.99	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-12 08:46:44.118215+00	1
284	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-12 08:48:48.370324+00	1
285	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-12 08:49:07.531563+00	1
286	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 09:19:08.552017+00	1
287	30	login	auth	User logged in	81.196.253.99	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-12 09:52:50.281514+00	1
288	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-12 12:56:37.35617+00	1
289	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=3355562195b397187dc1405cf6b738ae&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "3355562195b397187dc1405cf6b738ae"}	2025-07-12 12:57:17.058485+00	1
290	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=b86451e4d88bcee80617c8888d1473b6&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "b86451e4d88bcee80617c8888d1473b6"}	2025-07-12 12:59:47.907103+00	1
291	1	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 13:00:28.04348+00	1
292	1	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 13:02:06.939826+00	1
293	1	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 13:05:55.523962+00	1
374	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 03:12:20.551651+00	1
443	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 08:44:24.716423+00	1
294	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=862c8d32645e5c3b9bf05f46b19ed8c4&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "862c8d32645e5c3b9bf05f46b19ed8c4"}	2025-07-12 13:06:46.315455+00	1
295	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 13:11:12.121167+00	1
296	24	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=726bdda8e33a7fa02f8ed3d22d6ed864&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_token": "726bdda8e33a7fa02f8ed3d22d6ed864"}	2025-07-12 13:11:23.073469+00	1
297	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=da432761ddc811fcb6b4b7805b325fe8&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "da432761ddc811fcb6b4b7805b325fe8"}	2025-07-12 13:11:26.379875+00	1
298	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=d637a19a06ef99d1f61000f895d9b9cd&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "d637a19a06ef99d1f61000f895d9b9cd"}	2025-07-12 13:11:42.551267+00	1
299	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=8b09fa6237a41889e2e35dfc4bacb702&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "8b09fa6237a41889e2e35dfc4bacb702"}	2025-07-12 13:12:30.431611+00	1
300	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=63fcfa9444f95f8b04d25ba4c5d34a16&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "63fcfa9444f95f8b04d25ba4c5d34a16"}	2025-07-12 13:14:51.876583+00	1
301	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-12 13:23:01.399427+00	1
302	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=906fad007d28b38e48068e890a6e58a8&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "906fad007d28b38e48068e890a6e58a8"}	2025-07-12 13:23:27.712961+00	1
303	1	login	auth	User logged in	2001:e68:542f:645a:a154:fe25:bb3a:bfde	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-12 13:27:32.292999+00	1
304	1	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=e3c791c707f7cbea86e30f2f52230048&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_token": "e3c791c707f7cbea86e30f2f52230048"}	2025-07-12 13:27:35.370969+00	1
305	1	launch_game	gaming	Launched Kunoichi	\N	\N	\N	{"game_id": 52, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=42&token=dc0b8dec24f1e80344dd3679f65979fc&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "42", "game_name": "Kunoichi", "session_token": "dc0b8dec24f1e80344dd3679f65979fc"}	2025-07-12 13:27:52.342821+00	1
306	1	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=b8ea0176c52ebe0b687ff2541f9dce23&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_token": "b8ea0176c52ebe0b687ff2541f9dce23"}	2025-07-12 13:27:54.672985+00	1
307	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 13:28:49.281267+00	1
308	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=08ade29a48ac887912401de439fd3d31&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "08ade29a48ac887912401de439fd3d31"}	2025-07-12 13:29:04.407354+00	1
309	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=323e4811e78f55a074ef86984fee1c1f&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "323e4811e78f55a074ef86984fee1c1f"}	2025-07-12 13:30:07.116524+00	1
310	24	launch_game	gaming	Launched Rocketman	\N	\N	\N	{"game_id": 59, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=256&token=d2ee9c8472bf7dd5b9ac188f166bd614&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "256", "game_name": "Rocketman", "session_token": "d2ee9c8472bf7dd5b9ac188f166bd614"}	2025-07-12 13:30:56.536254+00	1
311	24	launch_game	gaming	Launched VIP French Roulette	\N	\N	\N	{"game_id": 55, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=48&token=34f74b8666b66352ecc5b30b29403497&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "48", "game_name": "VIP French Roulette", "session_token": "34f74b8666b66352ecc5b30b29403497"}	2025-07-12 13:31:58.284299+00	1
312	1	login	auth	User logged in	115.164.189.24	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-12 13:32:27.120008+00	1
440	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 08:36:40.700174+00	1
444	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 08:52:47.675223+00	1
313	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=9ced601aafc13c672206f59fe8d7e81f&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_token": "9ced601aafc13c672206f59fe8d7e81f"}	2025-07-12 13:32:40.763173+00	1
314	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=9d8e9cd33bfe63228e1d679c33fd225e&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "9d8e9cd33bfe63228e1d679c33fd225e"}	2025-07-12 13:32:47.350267+00	1
315	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=7401304881ed62d9cf330b03913b5d7f&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "7401304881ed62d9cf330b03913b5d7f"}	2025-07-12 13:34:30.654459+00	1
316	1	login	auth	User logged in	115.164.189.24	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-12 13:38:07.845011+00	1
317	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=767ee594a2dddf633ac15069a5d787c1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "767ee594a2dddf633ac15069a5d787c1"}	2025-07-12 13:38:24.791948+00	1
318	2	login	auth	User logged in	115.164.189.24	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-12 13:39:12.953842+00	1
319	2	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=d9fed320bdeb4cdd65c30833617b25ec&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "d9fed320bdeb4cdd65c30833617b25ec"}	2025-07-12 13:39:29.749936+00	1
320	24	launch_game	gaming	Launched Venice Carnival	\N	\N	\N	{"game_id": 47, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=27&token=5806098eda97a0c26f2788ea6868bf5a&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "27", "game_name": "Venice Carnival", "session_token": "5806098eda97a0c26f2788ea6868bf5a"}	2025-07-12 13:40:57.051707+00	1
321	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 13:41:13.814546+00	1
322	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=8d70ae80bf040971a6d1bf14c44ee017&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "8d70ae80bf040971a6d1bf14c44ee017"}	2025-07-12 13:41:25.347661+00	1
323	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=6d9a5fb2fea8c747a1d5124ae1a1521e&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_token": "6d9a5fb2fea8c747a1d5124ae1a1521e"}	2025-07-12 13:41:58.142753+00	1
324	24	launch_game	gaming	Launched Rocketman	\N	\N	\N	{"game_id": 59, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=256&token=d578b5efd45395d6854105e07dae5a72&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "256", "game_name": "Rocketman", "session_token": "d578b5efd45395d6854105e07dae5a72"}	2025-07-12 13:43:36.722411+00	1
325	24	launch_game	gaming	Launched Sakura	\N	\N	\N	{"game_id": 45, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=18&token=52469199a7ca58b9157051018f5e32e2&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "18", "game_name": "Sakura", "session_token": "52469199a7ca58b9157051018f5e32e2"}	2025-07-12 13:43:41.518498+00	1
326	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=b7b3fe877665f0c3a02f77418176ae64&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "b7b3fe877665f0c3a02f77418176ae64"}	2025-07-12 13:43:50.479108+00	1
327	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=907787359f0a2de8108b43ad08463b4f&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "907787359f0a2de8108b43ad08463b4f"}	2025-07-12 13:46:09.917219+00	1
328	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=83d76819363c322b0ade4aa2123e36e7&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "83d76819363c322b0ade4aa2123e36e7"}	2025-07-12 13:51:08.050143+00	1
329	24	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=f950d323b1a02a76a1d6b2e9d5f8d0d6&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_token": "f950d323b1a02a76a1d6b2e9d5f8d0d6"}	2025-07-12 13:51:32.233436+00	1
330	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 13:54:45.848002+00	1
331	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=99f8d969144a39eb8b9e6db042382ec5&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "99f8d969144a39eb8b9e6db042382ec5"}	2025-07-12 13:55:03.47478+00	1
332	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=f2e2efba0d77eaa08fc7f5dd787c20e4&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "f2e2efba0d77eaa08fc7f5dd787c20e4"}	2025-07-12 13:55:59.982609+00	1
333	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 14:03:11.667481+00	1
334	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=ce130ccdda6dab91480d4a6f387f18b8&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_token": "ce130ccdda6dab91480d4a6f387f18b8"}	2025-07-12 14:03:16.146406+00	1
335	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=6cd1b981a027f7e527096fe55104adeb&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_token": "6cd1b981a027f7e527096fe55104adeb"}	2025-07-12 14:03:26.114051+00	1
336	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=ef6d18f420ca61abfe7928042df267af&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_token": "ef6d18f420ca61abfe7928042df267af"}	2025-07-12 14:03:30.480906+00	1
337	24	login	auth	User logged in	2001:d08:2089:4f2a:d144:73fb:9c3a:eb09	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	\N	\N	2025-07-12 14:05:11.069389+00	1
338	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=e4f09ef5ef0fdac002251fd7d0d0c563&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_token": "e4f09ef5ef0fdac002251fd7d0d0c563"}	2025-07-12 14:05:15.253236+00	1
339	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=4bf31b2e5e5f4f8e47a5c15e83868ba6&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "4bf31b2e5e5f4f8e47a5c15e83868ba6"}	2025-07-12 14:06:08.757046+00	1
340	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=9eee627b71e81b3ddad6b84ce29ad7ba&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "9eee627b71e81b3ddad6b84ce29ad7ba"}	2025-07-12 14:07:16.897334+00	1
341	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 14:36:59.389612+00	1
342	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=9a582566d6d2ca84478d7a9239b0995b&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_token": "9a582566d6d2ca84478d7a9239b0995b"}	2025-07-12 14:37:03.022577+00	1
343	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=f5590811ce6135dbf68a7180a5b61b7f&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "f5590811ce6135dbf68a7180a5b61b7f"}	2025-07-12 14:37:13.118294+00	1
344	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=35efcb8e8e39a3f4f07fdac3761cd92c&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_token": "35efcb8e8e39a3f4f07fdac3761cd92c"}	2025-07-12 14:37:16.722287+00	1
345	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 14:54:18.763969+00	1
346	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 15:26:30.075722+00	1
347	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=bb1c8ea089c0de36383630c268dd4958&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "bb1c8ea089c0de36383630c268dd4958"}	2025-07-12 15:26:46.554324+00	1
348	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=8df26451575b9b5428224db0067f89be&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "8df26451575b9b5428224db0067f89be"}	2025-07-12 15:26:46.566686+00	1
349	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=6f823e53c0e9da0ea0b606a6a20acc65&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "6f823e53c0e9da0ea0b606a6a20acc65"}	2025-07-12 15:26:58.318928+00	1
350	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=4c6b4519bb281c16aa1e5baf3582a8b3&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "4c6b4519bb281c16aa1e5baf3582a8b3"}	2025-07-12 15:28:22.4911+00	1
441	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 08:37:21.398571+00	1
351	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=50789fb2530962628c77939c284b9992&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "50789fb2530962628c77939c284b9992"}	2025-07-12 15:29:11.096866+00	1
352	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=8b12f52057f4ac45f80238adb24aeb3d&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "8b12f52057f4ac45f80238adb24aeb3d"}	2025-07-12 15:32:25.776111+00	1
353	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=f16ef073920e8f5cc2688d75f36cd34d&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "f16ef073920e8f5cc2688d75f36cd34d"}	2025-07-12 15:36:36.812049+00	1
354	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=c3276985732be2c4d76e201b96cbcab1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "c3276985732be2c4d76e201b96cbcab1"}	2025-07-12 15:37:15.730734+00	1
355	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 16:12:56.529814+00	1
356	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=6b2ebd72b3d39a79449612452056e20c&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "6b2ebd72b3d39a79449612452056e20c"}	2025-07-12 16:13:03.072969+00	1
357	24	login	auth	User logged in	2001:d08:2089:4f2a:98c5:caa5:d2fe:e3a7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-12 16:34:48.426299+00	1
358	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=b4ffedfaf8a65608a5f2088ab3826d10&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_token": "b4ffedfaf8a65608a5f2088ab3826d10"}	2025-07-12 16:34:55.830266+00	1
359	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=d9bcca3d96b86d4fb046ac25c67fe9ce&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_token": "d9bcca3d96b86d4fb046ac25c67fe9ce"}	2025-07-12 16:34:55.845532+00	1
360	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=a00dba8f7debf3fed3e1ed39710f2f9f&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_token": "a00dba8f7debf3fed3e1ed39710f2f9f"}	2025-07-12 16:38:08.055094+00	1
361	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=af51b3d5564a81c438ec90e40d5fbee7&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_token": "af51b3d5564a81c438ec90e40d5fbee7"}	2025-07-12 16:38:57.94258+00	1
362	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=5c6d1e555f675d45585cf9745c0cd37e&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_token": "5c6d1e555f675d45585cf9745c0cd37e"}	2025-07-12 16:39:31.725223+00	1
363	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=d504d8f4e51e8f5c7356b1f13436cfd7&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_token": "d504d8f4e51e8f5c7356b1f13436cfd7"}	2025-07-12 16:40:10.655725+00	1
364	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 02:00:34.946396+00	1
365	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=df326ae75bed2ffe7121fed83a82bb5f&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_token": "df326ae75bed2ffe7121fed83a82bb5f"}	2025-07-13 02:00:39.075803+00	1
366	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 02:40:21.341709+00	1
367	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 03:00:31.749515+00	1
368	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 03:00:39.319388+00	1
369	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 03:01:22.606888+00	1
370	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 03:02:02.91774+00	1
371	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 03:02:25.812993+00	1
372	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 03:08:45.503885+00	1
373	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 03:09:46.565564+00	1
375	1	launch_game	gaming	Launched Sakura	\N	\N	\N	{"game_id": 45, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=18&token=b6bbe88c8c064f206cec8edf15657dd6&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "18", "game_name": "Sakura", "session_token": "b6bbe88c8c064f206cec8edf15657dd6"}	2025-07-13 03:12:23.560116+00	1
376	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=2c8cb6339584126ba2a959970b7549e8&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "2c8cb6339584126ba2a959970b7549e8"}	2025-07-13 03:13:26.161507+00	1
377	1	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=803c97f8b8b25257a83dd383e4b384a2&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_token": "803c97f8b8b25257a83dd383e4b384a2"}	2025-07-13 03:13:32.440655+00	1
378	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=e10219905b067e8ad3d62904330fe505&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_token": "e10219905b067e8ad3d62904330fe505"}	2025-07-13 03:13:36.661082+00	1
379	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 03:13:45.401407+00	1
380	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=b22fbf2c5c890426a1232fdbe99f8de3&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_token": "b22fbf2c5c890426a1232fdbe99f8de3"}	2025-07-13 03:13:46.883364+00	1
381	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=c744f44d1e8d0a28dcb6a94d60c28b8d&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_token": "c744f44d1e8d0a28dcb6a94d60c28b8d"}	2025-07-13 03:13:51.161441+00	1
382	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=bfa68ffbee08a1675091cd6c6f574f02&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_token": "bfa68ffbee08a1675091cd6c6f574f02"}	2025-07-13 03:15:10.035399+00	1
383	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 03:15:21.881897+00	1
384	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=7ebda044cd0582ef42ed29010f6c2f19&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_token": "7ebda044cd0582ef42ed29010f6c2f19"}	2025-07-13 03:15:45.579678+00	1
385	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 03:17:34.342521+00	1
386	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=87794f8b2f27f64e3a51b5ef342334c8&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=10090.00&session_id=1_53_1752376795446", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "user_balance": "10090.00", "session_token": "87794f8b2f27f64e3a51b5ef342334c8"}	2025-07-13 03:19:55.447535+00	1
387	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 03:22:40.371485+00	1
388	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=885dfb4fcc4838be12503db0532e680c&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=10090.00&session_id=1_53_1752376984306", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "1_53_1752376984306", "user_balance": "10090.00", "session_token": "885dfb4fcc4838be12503db0532e680c"}	2025-07-13 03:23:04.307722+00	1
389	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=932bccfaa0d97aebd0bb8545acabd697&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=10090.00&session_id=1_53_1752377195042", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "1_53_1752377195042", "user_balance": "10090.00", "session_token": "932bccfaa0d97aebd0bb8545acabd697"}	2025-07-13 03:26:35.043224+00	1
390	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=4ff278018ece24167843f40f6090d48d&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=10090.00&session_id=1_53_1752377331931", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "1_53_1752377331931", "user_balance": "10090.00", "session_token": "4ff278018ece24167843f40f6090d48d"}	2025-07-13 03:28:51.932792+00	1
391	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 03:29:55.610272+00	1
442	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 08:41:06.825401+00	1
445	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 08:53:17.10939+00	1
715	1	login	auth	User logged in	202.186.117.125	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-22 05:42:13.487634+00	1
392	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=a890452ec57b763224fec27de980be9a&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=10090.00&session_id=1_53_1752377396596", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "1_53_1752377396596", "user_balance": "10090.00", "session_token": "a890452ec57b763224fec27de980be9a"}	2025-07-13 03:29:56.596682+00	1
393	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 03:30:58.847121+00	1
394	24	login	auth	User logged in	2001:d08:1205:f867:a017:8b45:6bb:f9e1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-13 03:42:30.128118+00	1
395	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=6fea00fcbd037481d0f6f1991895a0e9&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_53_1752378163704", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752378163704", "user_balance": "0.00", "session_token": "6fea00fcbd037481d0f6f1991895a0e9"}	2025-07-13 03:42:43.705199+00	1
396	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=9a4cdf811930683f76a41550b3eaa174&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_53_1752378163706", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752378163706", "user_balance": "0.00", "session_token": "9a4cdf811930683f76a41550b3eaa174"}	2025-07-13 03:42:43.706994+00	1
397	24	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=c868230980983701d3467bfeb907f03a&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_41_1752378236793", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_id": "24_41_1752378236793", "user_balance": "0.00", "session_token": "c868230980983701d3467bfeb907f03a"}	2025-07-13 03:43:56.794582+00	1
398	24	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=c96509702e11ce93255c5f91121ef368&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_41_1752378236809", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_id": "24_41_1752378236809", "user_balance": "0.00", "session_token": "c96509702e11ce93255c5f91121ef368"}	2025-07-13 03:43:56.809712+00	1
399	24	login	auth	User logged in	2001:d08:1205:f867:a017:8b45:6bb:f9e1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-13 04:02:37.942596+00	1
400	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 04:24:14.189311+00	1
401	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=3cf8bc8f0b38e9a2e2cbe67df9d5c7f0&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=10090.00&session_id=1_39_1752380655526", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752380655526", "user_balance": "10090.00", "session_token": "3cf8bc8f0b38e9a2e2cbe67df9d5c7f0"}	2025-07-13 04:24:15.526384+00	1
402	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 04:26:04.380896+00	1
403	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=474775f230030a16f6999c3648b44887&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=10105.00&session_id=1_53_1752380786085", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "1_53_1752380786085", "user_balance": "10105.00", "session_token": "474775f230030a16f6999c3648b44887"}	2025-07-13 04:26:26.086052+00	1
404	1	login	auth	User logged in	2a02:2f04:1b7:8601:8429:9b2b:67a8:3d9f	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	\N	\N	2025-07-13 04:51:49.482885+00	1
405	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 04:55:41.678401+00	1
406	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 05:03:10.324947+00	1
407	1	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=8d3a0ee1bc5c8ed2d0fc0db4c432a6e2&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_40_1752382991697", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_id": "1_40_1752382991697", "user_balance": "105.00", "session_token": "8d3a0ee1bc5c8ed2d0fc0db4c432a6e2"}	2025-07-13 05:03:11.69849+00	1
408	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 05:25:53.737421+00	1
409	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 05:26:46.208806+00	1
410	1	login	auth	User logged in	2a02:2f04:1b7:8601:d590:c137:f369:1343	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-13 05:46:39.722457+00	1
411	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 06:02:36.865757+00	1
412	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=665b64b9ea8597c8fc4bca2bddef37ee&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_39_1752386647451", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752386647451", "user_balance": "105.00", "session_token": "665b64b9ea8597c8fc4bca2bddef37ee"}	2025-07-13 06:04:07.4538+00	1
413	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 06:04:38.798713+00	1
414	1	login	auth	User logged in	2001:d08:1205:f867:a017:8b45:6bb:f9e1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-13 06:05:03.268999+00	1
415	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 06:22:24.263205+00	1
416	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 06:23:04.226056+00	1
417	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 06:23:13.937093+00	1
418	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 06:41:21.88859+00	1
419	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 06:41:42.167274+00	1
420	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 06:46:29.347931+00	1
421	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 06:48:18.546471+00	1
422	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 06:50:32.502757+00	1
423	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 06:53:12.290862+00	1
424	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 06:59:16.501672+00	1
425	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 07:00:41.204449+00	1
426	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 07:09:26.000317+00	1
427	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 07:11:13.047341+00	1
428	24	login	auth	User logged in	2001:d08:1205:f867:a017:8b45:6bb:f9e1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-13 07:16:14.361068+00	1
429	24	login	auth	User logged in	2001:d08:1205:f867:a017:8b45:6bb:f9e1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-13 07:17:14.183662+00	1
430	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 07:17:24.742408+00	1
431	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 07:19:33.895871+00	1
432	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=3f296cf8637b9f5e466a425f6757cdb3&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_39_1752391353539", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752391353539", "user_balance": "0.00", "session_token": "3f296cf8637b9f5e466a425f6757cdb3"}	2025-07-13 07:22:33.540539+00	1
433	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=ca092d3c4e8eadfc04f15fd40b67a640&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_39_1752391353541", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752391353541", "user_balance": "0.00", "session_token": "ca092d3c4e8eadfc04f15fd40b67a640"}	2025-07-13 07:22:33.54145+00	1
434	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=4ef1521a6c65011b2cf71a39528e52b4&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_53_1752391372766", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752391372766", "user_balance": "0.00", "session_token": "4ef1521a6c65011b2cf71a39528e52b4"}	2025-07-13 07:22:52.7675+00	1
435	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=6744ce2b3ac18c8471a3e99c80282ebe&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_53_1752391372769", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752391372769", "user_balance": "0.00", "session_token": "6744ce2b3ac18c8471a3e99c80282ebe"}	2025-07-13 07:22:52.769928+00	1
436	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 08:11:08.520421+00	1
437	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 08:27:56.999354+00	1
438	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 08:30:53.233135+00	1
439	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 08:32:48.227864+00	1
446	24	login	auth	User logged in	113.211.130.225	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	\N	\N	2025-07-13 08:55:27.771657+00	1
447	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=dd210451b9b0090fd615e6e3061cccb0&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_56_1752396947558", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752396947558", "user_balance": "0.00", "session_token": "dd210451b9b0090fd615e6e3061cccb0"}	2025-07-13 08:55:47.560733+00	1
448	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 08:56:09.96928+00	1
449	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 09:09:41.910678+00	1
450	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 09:17:14.838901+00	1
451	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 09:19:57.616869+00	1
452	1	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=d81796f910b545815fc04d82242f02f9&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_42_1752398431493", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_id": "1_42_1752398431493", "user_balance": "105.00", "session_token": "d81796f910b545815fc04d82242f02f9"}	2025-07-13 09:20:31.49335+00	1
453	1	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=53845a8b6e87695cc6e611ed6c119989&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_42_1752398614592", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_id": "1_42_1752398614592", "user_balance": "105.00", "session_token": "53845a8b6e87695cc6e611ed6c119989"}	2025-07-13 09:23:34.592395+00	1
454	1	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=698bc89459f77f039a411816cb741d6c&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_56_1752398619487", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "1_56_1752398619487", "user_balance": "105.00", "session_token": "698bc89459f77f039a411816cb741d6c"}	2025-07-13 09:23:39.487255+00	1
455	1	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=4831eae676ff9f240c15b612e0355354&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_56_1752398632760", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "1_56_1752398632760", "user_balance": "105.00", "session_token": "4831eae676ff9f240c15b612e0355354"}	2025-07-13 09:23:52.760679+00	1
456	1	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=747ccb32d16a958ddc0a6c60e73d188e&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_56_1752398658792", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "1_56_1752398658792", "user_balance": "105.00", "session_token": "747ccb32d16a958ddc0a6c60e73d188e"}	2025-07-13 09:24:18.792579+00	1
457	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 09:24:57.057766+00	1
458	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=52d700722764849ee4a7bb4c321701b7&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_51_1752398703733", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1752398703733", "user_balance": "105.00", "session_token": "52d700722764849ee4a7bb4c321701b7"}	2025-07-13 09:25:03.733452+00	1
459	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 09:26:19.393784+00	1
460	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=9bba3044cb61499bb6a4e5394b5255e7&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_53_1752398808035", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "1_53_1752398808035", "user_balance": "105.00", "session_token": "9bba3044cb61499bb6a4e5394b5255e7"}	2025-07-13 09:26:48.035634+00	1
461	1	launch_game	gaming	Launched Sakura	\N	\N	\N	{"game_id": 45, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=18&token=dca008b67f7b8fc036aa3424ec474aa3&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_45_1752398906906", "provider": "iconix", "game_code": "18", "game_name": "Sakura", "session_id": "1_45_1752398906906", "user_balance": "105.00", "session_token": "dca008b67f7b8fc036aa3424ec474aa3"}	2025-07-13 09:28:26.9069+00	1
498	1	login	auth	User logged in	2001:f40:906:11c2:d887:6fd2:c7ae:390c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-14 06:32:28.499802+00	1
720	1	login	auth	User logged in	202.186.117.125	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-22 08:17:02.918919+00	1
462	1	launch_game	gaming	Launched Sakura	\N	\N	\N	{"game_id": 45, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=18&token=c81ab5d5f76537ae3c4ead56bc4b2c78&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_45_1752398940987", "provider": "iconix", "game_code": "18", "game_name": "Sakura", "session_id": "1_45_1752398940987", "user_balance": "105.00", "session_token": "c81ab5d5f76537ae3c4ead56bc4b2c78"}	2025-07-13 09:29:00.988111+00	1
463	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=4af4ff8fb906466ac5ed26970b36e39f&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_53_1752399186441", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "1_53_1752399186441", "user_balance": "105.00", "session_token": "4af4ff8fb906466ac5ed26970b36e39f"}	2025-07-13 09:33:06.442221+00	1
464	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 09:35:35.12203+00	1
465	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 09:40:26.868487+00	1
466	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 10:00:13.506185+00	1
467	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 10:01:44.090744+00	1
468	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 10:06:04.502285+00	1
469	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 10:07:58.097812+00	1
470	1	login	auth	User logged in	2001:e68:542f:645a:c8fb:99bc:6d68:bf7	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-13 10:19:08.005352+00	1
471	24	login	auth	User logged in	2001:d08:1205:f867:a017:8b45:6bb:f9e1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-13 10:57:41.177085+00	1
472	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=b7321368b8f918d5ba9dbc46a4b3af1f&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_58_1752405870845", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_id": "24_58_1752405870845", "user_balance": "0.00", "session_token": "b7321368b8f918d5ba9dbc46a4b3af1f"}	2025-07-13 11:24:30.846599+00	1
473	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=0d22047ce602784b6c1d4ee35aef3831&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_58_1752405870847", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_id": "24_58_1752405870847", "user_balance": "0.00", "session_token": "0d22047ce602784b6c1d4ee35aef3831"}	2025-07-13 11:24:30.84757+00	1
474	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=5ebf4a7d790211167556fc9506ec1916&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_58_1752406354364", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_id": "24_58_1752406354364", "user_balance": "0.00", "session_token": "5ebf4a7d790211167556fc9506ec1916"}	2025-07-13 11:32:34.365134+00	1
475	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=9cf2794d460830fc5bc452b5fdb8e58d&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_58_1752406414149", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_id": "24_58_1752406414149", "user_balance": "0.00", "session_token": "9cf2794d460830fc5bc452b5fdb8e58d"}	2025-07-13 11:33:34.149349+00	1
476	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=92f3cac817ce180f52a89a668c400bef&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_58_1752406433191", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_id": "24_58_1752406433191", "user_balance": "0.00", "session_token": "92f3cac817ce180f52a89a668c400bef"}	2025-07-13 11:33:53.191797+00	1
477	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=e1c8b100bbec2c9acc06e5343bcb7950&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_58_1752406469818", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_id": "24_58_1752406469818", "user_balance": "0.00", "session_token": "e1c8b100bbec2c9acc06e5343bcb7950"}	2025-07-13 11:34:29.819426+00	1
478	1	login	auth	User logged in	81.196.253.99	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-13 11:57:54.663032+00	1
479	1	login	auth	User logged in	81.196.253.99	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-13 11:58:16.194972+00	1
480	1	login	auth	User logged in	81.196.253.99	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-13 11:59:48.87549+00	1
481	24	login	auth	User logged in	2001:d08:1205:f867:a017:8b45:6bb:f9e1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-13 12:16:37.947087+00	1
482	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=765a9a4fdedc58ba800c41414b7867e3&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_53_1752409001457", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752409001457", "user_balance": "0.00", "session_token": "765a9a4fdedc58ba800c41414b7867e3"}	2025-07-13 12:16:41.458259+00	1
483	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=29eac0bebbf0d1fbe28d45758360f667&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_53_1752409001470", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752409001470", "user_balance": "0.00", "session_token": "29eac0bebbf0d1fbe28d45758360f667"}	2025-07-13 12:16:41.470765+00	1
484	24	login	auth	User logged in	2001:d08:1205:f867:a017:8b45:6bb:f9e1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-13 12:45:58.443776+00	1
485	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=71873671efae970e0855045f904c8382&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_53_1752410761776", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752410761776", "user_balance": "0.00", "session_token": "71873671efae970e0855045f904c8382"}	2025-07-13 12:46:01.776487+00	1
486	24	login	auth	User logged in	2001:d08:1205:f867:40ac:735:38ea:c3fc	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	\N	\N	2025-07-13 12:48:38.691128+00	1
487	24	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=862cd9cce231e6662697072511ca1c2c&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_40_1752410923819", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_id": "24_40_1752410923819", "user_balance": "0.00", "session_token": "862cd9cce231e6662697072511ca1c2c"}	2025-07-13 12:48:43.819758+00	1
488	24	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=f6019983967a68d5de04ce71c04b21ed&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_40_1752411088144", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_id": "24_40_1752411088144", "user_balance": "0.00", "session_token": "f6019983967a68d5de04ce71c04b21ed"}	2025-07-13 12:51:28.145212+00	1
489	30	login	auth	User logged in	2a02:2f04:1b7:8601:594a:fd2b:9fa1:550e	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-13 19:04:24.285167+00	1
490	30	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=0df2c92d5835bf28c82c76b3932e54b0&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=30_39_1752433468221", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "30_39_1752433468221", "user_balance": "0.00", "session_token": "0df2c92d5835bf28c82c76b3932e54b0"}	2025-07-13 19:04:28.222177+00	1
491	30	launch_game	gaming	Launched Naga King	\N	\N	\N	{"game_id": 44, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=15&token=a6956074e64beffaecde9dc8205be76c&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=30_44_1752433547735", "provider": "iconix", "game_code": "15", "game_name": "Naga King", "session_id": "30_44_1752433547735", "user_balance": "0.00", "session_token": "a6956074e64beffaecde9dc8205be76c"}	2025-07-13 19:05:47.735613+00	1
492	1	login	auth	User logged in	202.186.85.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 04:54:58.371949+00	1
493	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=892794abfe74d522537907843d5ebe95&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_51_1752468903789", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1752468903789", "user_balance": "105.00", "session_token": "892794abfe74d522537907843d5ebe95"}	2025-07-14 04:55:03.78942+00	1
494	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=056dd1af930e207d2c59125956f82a54&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_51_1752468916557", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1752468916557", "user_balance": "105.00", "session_token": "056dd1af930e207d2c59125956f82a54"}	2025-07-14 04:55:16.557217+00	1
495	1	login	auth	User logged in	202.186.85.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 05:47:15.555546+00	1
496	24	login	auth	User logged in	2001:f40:906:11c2:d887:6fd2:c7ae:390c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-14 06:31:38.811753+00	1
497	24	launch_game	gaming	Launched Pro Roulette	\N	\N	\N	{"game_id": 57, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=50&token=d44e9082ad32960a3daff8ef6dd3bd29&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_57_1752474726021", "provider": "iconix", "game_code": "50", "game_name": "Pro Roulette", "session_id": "24_57_1752474726021", "user_balance": "0.00", "session_token": "d44e9082ad32960a3daff8ef6dd3bd29"}	2025-07-14 06:32:06.021372+00	1
499	1	launch_game	gaming	Launched Pro Roulette	\N	\N	\N	{"game_id": 57, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=50&token=f4c5784bcababc554631f6153ba0f699&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_57_1752474753153", "provider": "iconix", "game_code": "50", "game_name": "Pro Roulette", "session_id": "1_57_1752474753153", "user_balance": "105.00", "session_token": "f4c5784bcababc554631f6153ba0f699"}	2025-07-14 06:32:33.153611+00	1
500	30	login	auth	User logged in	5.12.125.116	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-14 06:54:53.935315+00	1
501	30	launch_game	gaming	Launched Kunoichi	\N	\N	\N	{"game_id": 52, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=42&token=fe1b15392b82468601c461953a6d782b&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=30_52_1752476417833", "provider": "iconix", "game_code": "42", "game_name": "Kunoichi", "session_id": "30_52_1752476417833", "user_balance": "0.00", "session_token": "fe1b15392b82468601c461953a6d782b"}	2025-07-14 07:00:17.834185+00	1
502	30	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=3b418f8a1d3e370488b48ae64bde97e4&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=30_39_1752476447862", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "30_39_1752476447862", "user_balance": "0.00", "session_token": "3b418f8a1d3e370488b48ae64bde97e4"}	2025-07-14 07:00:47.86306+00	1
503	30	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=f68e7502e2dd4c22d4346d985e172079&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=30_40_1752476481089", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_id": "30_40_1752476481089", "user_balance": "0.00", "session_token": "f68e7502e2dd4c22d4346d985e172079"}	2025-07-14 07:01:21.089264+00	1
504	30	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=54d9937ab2522f63b7319af9f57086e8&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=30_40_1752476497351", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_id": "30_40_1752476497351", "user_balance": "0.00", "session_token": "54d9937ab2522f63b7319af9f57086e8"}	2025-07-14 07:01:37.352087+00	1
505	30	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=7cc86557501eb9515d7b6a82fb5a8775&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_51_1752476537810", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "30_51_1752476537810", "user_balance": "100000.00", "session_token": "7cc86557501eb9515d7b6a82fb5a8775"}	2025-07-14 07:02:17.810804+00	1
506	30	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=4a6b66d728e161e879f19116b4e59ce0&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_51_1752476556147", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "30_51_1752476556147", "user_balance": "100000.00", "session_token": "4a6b66d728e161e879f19116b4e59ce0"}	2025-07-14 07:02:36.148173+00	1
507	1	login	auth	User logged in	202.186.85.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 07:06:10.693602+00	1
508	30	launch_game	gaming	Launched Dojo	\N	\N	\N	{"game_id": 49, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=30&token=470cc3d792eec82f13a73474289aa04a&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_49_1752477152715", "provider": "iconix", "game_code": "30", "game_name": "Dojo", "session_id": "30_49_1752477152715", "user_balance": "100000.00", "session_token": "470cc3d792eec82f13a73474289aa04a"}	2025-07-14 07:12:32.715817+00	1
509	1	login	auth	User logged in	202.186.85.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 07:13:18.094294+00	1
510	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=bb2738f92c551d2afb3f04edd3f0c75b&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_39_1752477200332", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752477200332", "user_balance": "105.00", "session_token": "bb2738f92c551d2afb3f04edd3f0c75b"}	2025-07-14 07:13:20.332656+00	1
511	30	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=87fb54ed141c7bac51bc5120e2058248&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_51_1752477242362", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "30_51_1752477242362", "user_balance": "100000.00", "session_token": "87fb54ed141c7bac51bc5120e2058248"}	2025-07-14 07:14:02.362393+00	1
512	30	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=76831858db118c43a0aa037ef1a672cd&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_39_1752477267566", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "30_39_1752477267566", "user_balance": "100000.00", "session_token": "76831858db118c43a0aa037ef1a672cd"}	2025-07-14 07:14:27.566443+00	1
513	30	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=baa355495ec885c6c7a482f96904fa95&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_51_1752477900857", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "30_51_1752477900857", "user_balance": "100000.00", "session_token": "baa355495ec885c6c7a482f96904fa95"}	2025-07-14 07:25:00.858094+00	1
514	30	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=d83fc94e2ed7d2d4ca272f1da71be3e5&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_51_1752478401897", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "30_51_1752478401897", "user_balance": "100000.00", "session_token": "d83fc94e2ed7d2d4ca272f1da71be3e5"}	2025-07-14 07:33:21.897256+00	1
515	30	login	auth	User logged in	81.196.253.99	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-14 09:22:14.173326+00	1
516	1	login	auth	User logged in	81.196.253.99	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-14 09:23:44.826283+00	1
517	1	login	auth	User logged in	81.196.253.99	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-14 09:23:56.771152+00	1
518	24	login	auth	User logged in	2001:d08:1204:77ad:43f:1945:38b2:c245	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-14 11:21:05.813271+00	1
519	1	login	auth	User logged in	2001:e68:542f:645a:6c3b:2b06:ffd3:1d8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 11:22:31.186068+00	1
520	1	login	auth	User logged in	2001:d08:2188:ce0e:a892:e60:ba8c:779a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-14 11:28:47.386674+00	1
521	1	login	auth	User logged in	81.196.253.99	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-14 11:38:46.117201+00	1
522	1	login	auth	User logged in	2001:d08:2188:ce0e:a892:e60:ba8c:779a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-14 11:41:32.064431+00	1
523	30	login	auth	User logged in	81.196.253.99	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-14 11:42:39.457597+00	1
524	30	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=5e7499f763f50e209ace7c001e642d13&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_51_1752493366747", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "30_51_1752493366747", "user_balance": "100000.00", "session_token": "5e7499f763f50e209ace7c001e642d13"}	2025-07-14 11:42:46.748663+00	1
525	1	login	auth	User logged in	2001:e68:542f:645a:6c3b:2b06:ffd3:1d8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 11:49:44.043095+00	1
526	24	login	auth	User logged in	2001:d08:2188:ce0e:a892:e60:ba8c:779a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-14 11:49:55.887147+00	1
527	30	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=c646543423a89f766a3907fbd562d627&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_51_1752494065563", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "30_51_1752494065563", "user_balance": "100000.00", "session_token": "c646543423a89f766a3907fbd562d627"}	2025-07-14 11:54:25.564708+00	1
528	30	launch_game	gaming	Launched Naga King	\N	\N	\N	{"game_id": 44, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=15&token=b8741a025f826a05cc7b841dfed71b96&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_44_1752494085019", "provider": "iconix", "game_code": "15", "game_name": "Naga King", "session_id": "30_44_1752494085019", "user_balance": "100000.00", "session_token": "b8741a025f826a05cc7b841dfed71b96"}	2025-07-14 11:54:45.020399+00	1
529	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=cd44988c1ae1b930f8f10f7af50a73a4&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_58_1752494363716", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_id": "24_58_1752494363716", "user_balance": "1000.00", "session_token": "cd44988c1ae1b930f8f10f7af50a73a4"}	2025-07-14 11:59:23.716613+00	1
530	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=018e6cfad689f7ef7a08013bfbeb817b&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_58_1752494363728", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_id": "24_58_1752494363728", "user_balance": "1000.00", "session_token": "018e6cfad689f7ef7a08013bfbeb817b"}	2025-07-14 11:59:23.72941+00	1
531	1	login	auth	User logged in	2001:e68:542f:645a:6c3b:2b06:ffd3:1d8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 12:00:12.760508+00	1
532	30	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=67af00e87632c31707fb477f7953fdd9&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_42_1752494583656", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_id": "30_42_1752494583656", "user_balance": "100000.00", "session_token": "67af00e87632c31707fb477f7953fdd9"}	2025-07-14 12:03:03.656945+00	1
533	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=0c89e492e4ccecad0b7fd772e176ac4c&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_58_1752494774319", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_id": "24_58_1752494774319", "user_balance": "1000.00", "session_token": "0c89e492e4ccecad0b7fd772e176ac4c"}	2025-07-14 12:06:14.319626+00	1
534	1	login	auth	User logged in	2001:e68:542f:645a:6c3b:2b06:ffd3:1d8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 12:08:27.858407+00	1
535	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=f7f5349dcd48a6d143f2a59449a6d0e7&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_58_1752494972788", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_id": "24_58_1752494972788", "user_balance": "1000.00", "session_token": "f7f5349dcd48a6d143f2a59449a6d0e7"}	2025-07-14 12:09:32.788952+00	1
536	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=89926d5f644b5317de1c6c3a5104e42b&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_53_1752495049903", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752495049903", "user_balance": "1000.00", "session_token": "89926d5f644b5317de1c6c3a5104e42b"}	2025-07-14 12:10:49.904915+00	1
537	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=f36838c96cdc4408abbfd4dbff289404&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_53_1752495049905", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752495049905", "user_balance": "1000.00", "session_token": "f36838c96cdc4408abbfd4dbff289404"}	2025-07-14 12:10:49.905879+00	1
538	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=f8a32dbd30241840a474f80a214ed6c9&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_53_1752495154649", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752495154649", "user_balance": "1000.00", "session_token": "f8a32dbd30241840a474f80a214ed6c9"}	2025-07-14 12:12:34.651602+00	1
539	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=ba31d9689bfe11686789a6eb46ec96f7&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_53_1752495261643", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752495261643", "user_balance": "1000.00", "session_token": "ba31d9689bfe11686789a6eb46ec96f7"}	2025-07-14 12:14:21.64345+00	1
540	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=c9a0740eef88593915bc41f3be9cfd8e&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_53_1752495297183", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752495297183", "user_balance": "1000.00", "session_token": "c9a0740eef88593915bc41f3be9cfd8e"}	2025-07-14 12:14:57.183705+00	1
541	1	login	auth	User logged in	2001:e68:542f:645a:6c3b:2b06:ffd3:1d8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 12:15:18.293159+00	1
542	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=cc0dc6343616f7d3e3762c1142d23f16&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_53_1752495475700", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752495475700", "user_balance": "1000.00", "session_token": "cc0dc6343616f7d3e3762c1142d23f16"}	2025-07-14 12:17:55.701818+00	1
543	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=9b96fba109aff53afe52bc5b19b2bbe2&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_53_1752495613232", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752495613232", "user_balance": "1000.00", "session_token": "9b96fba109aff53afe52bc5b19b2bbe2"}	2025-07-14 12:20:13.232377+00	1
544	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=1fb070bf8a0dd4e830a8c3e6086c78cf&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_53_1752495645640", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752495645640", "user_balance": "1000.00", "session_token": "1fb070bf8a0dd4e830a8c3e6086c78cf"}	2025-07-14 12:20:45.640311+00	1
545	1	login	auth	User logged in	2001:e68:542f:645a:6c3b:2b06:ffd3:1d8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 12:20:54.899765+00	1
610	1	login	auth	User logged in	2001:d08:2188:ce0e:614c:f136:a5bc:3d94	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-14 14:04:10.844872+00	1
732	1	login	auth	User logged in	2a02:2f04:82d:9500:1106:b42c:5ba9:485f	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-22 09:15:51.40678+00	1
546	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=1b7d598dcddf4424a113ad2e4658026d&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_53_1752495967038", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752495967038", "user_balance": "1000.00", "session_token": "1b7d598dcddf4424a113ad2e4658026d"}	2025-07-14 12:26:07.03854+00	1
547	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=002c19b549676d575412d02521a470d6&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_53_1752496014928", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752496014928", "user_balance": "1000.00", "session_token": "002c19b549676d575412d02521a470d6"}	2025-07-14 12:26:54.928692+00	1
548	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=fce9539815cbc8671494db51b88bc535&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496035523", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496035523", "user_balance": "1000.00", "session_token": "fce9539815cbc8671494db51b88bc535"}	2025-07-14 12:27:15.524144+00	1
549	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=a2303e4844076cdf3558807da4bfdf09&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496035528", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496035528", "user_balance": "1000.00", "session_token": "a2303e4844076cdf3558807da4bfdf09"}	2025-07-14 12:27:15.528642+00	1
550	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=e5d0fedc697cae1b95dedeedaa8316cd&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496044350", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496044350", "user_balance": "1000.00", "session_token": "e5d0fedc697cae1b95dedeedaa8316cd"}	2025-07-14 12:27:24.350996+00	1
551	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=e5c849c7128624f12a9af6802ed3feec&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496111249", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496111249", "user_balance": "1000.00", "session_token": "e5c849c7128624f12a9af6802ed3feec"}	2025-07-14 12:28:31.249332+00	1
552	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=998988e6197f74dcc6f4ab67ef3f2339&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496154904", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496154904", "user_balance": "1000.00", "session_token": "998988e6197f74dcc6f4ab67ef3f2339"}	2025-07-14 12:29:14.904865+00	1
553	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=1b3a9153de44588cb4ae1d9035c0556e&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496208877", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496208877", "user_balance": "1000.00", "session_token": "1b3a9153de44588cb4ae1d9035c0556e"}	2025-07-14 12:30:08.877469+00	1
554	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=2af33bb2d3dde8e215db3bd4aff1ff41&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496211648", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496211648", "user_balance": "1000.00", "session_token": "2af33bb2d3dde8e215db3bd4aff1ff41"}	2025-07-14 12:30:11.648617+00	1
555	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=a43f242af1839a7a29c30a60e58d29d3&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496261016", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496261016", "user_balance": "1000.00", "session_token": "a43f242af1839a7a29c30a60e58d29d3"}	2025-07-14 12:31:01.016575+00	1
556	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=e566f849146fae32d212073d825d36a5&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496288425", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496288425", "user_balance": "1000.00", "session_token": "e566f849146fae32d212073d825d36a5"}	2025-07-14 12:31:28.42573+00	1
704	1	login	auth	User logged in	2001:e68:542f:645a:a869:e26f:95d6:14d3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-15 14:25:33.435126+00	1
733	24	login	auth	User logged in	2001:d08:2303:365:94e:316:11d4:e60c	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-22 10:51:29.296435+00	1
557	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=ba623e8a089f8d783693e098cc441f45&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496293314", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496293314", "user_balance": "1000.00", "session_token": "ba623e8a089f8d783693e098cc441f45"}	2025-07-14 12:31:33.314997+00	1
558	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=b53cd5728771f94c31bd8ebb8a2a4d54&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=105.00&session_id=1_51_1752496304082", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1752496304082", "user_balance": "105.00", "session_token": "b53cd5728771f94c31bd8ebb8a2a4d54"}	2025-07-14 12:31:44.083127+00	1
559	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=9aa3374f855cadb7e0abd3c8af08f6ad&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496340030", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496340030", "user_balance": "1000.00", "session_token": "9aa3374f855cadb7e0abd3c8af08f6ad"}	2025-07-14 12:32:20.030343+00	1
560	1	login	auth	User logged in	2001:e68:542f:645a:6c3b:2b06:ffd3:1d8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 12:32:58.750817+00	1
561	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=a37e25917d3c5b07f7b1a7ee80b9cccf&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496393813", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496393813", "user_balance": "1000.00", "session_token": "a37e25917d3c5b07f7b1a7ee80b9cccf"}	2025-07-14 12:33:13.813653+00	1
562	2	login	auth	User logged in	2001:e68:542f:645a:6c3b:2b06:ffd3:1d8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 12:33:40.015961+00	1
563	2	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=5f03bed568a7f1d5bfee1f19611d6b66&user_id=2&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100.00&session_id=2_51_1752496431264", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "2_51_1752496431264", "user_balance": "100.00", "session_token": "5f03bed568a7f1d5bfee1f19611d6b66"}	2025-07-14 12:33:51.264282+00	1
564	2	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=17d55066f5ca96b820ea552477ed9a94&user_id=2&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100.00&session_id=2_51_1752496518055", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "2_51_1752496518055", "user_balance": "100.00", "session_token": "17d55066f5ca96b820ea552477ed9a94"}	2025-07-14 12:35:18.05562+00	1
565	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=fc9a4613475691551e890e915785d72a&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496606610", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496606610", "user_balance": "1000.00", "session_token": "fc9a4613475691551e890e915785d72a"}	2025-07-14 12:36:46.611079+00	1
566	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=2ed2f5d58b4444dbbb04df2b7e8833f6&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496645878", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496645878", "user_balance": "1000.00", "session_token": "2ed2f5d58b4444dbbb04df2b7e8833f6"}	2025-07-14 12:37:25.878276+00	1
567	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=f1337ca78b31d907d11e25b33bce0b7d&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496651057", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496651057", "user_balance": "1000.00", "session_token": "f1337ca78b31d907d11e25b33bce0b7d"}	2025-07-14 12:37:31.057615+00	1
568	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=9949b4f080404f0697c5fd570cc84f60&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496796513", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496796513", "user_balance": "1000.00", "session_token": "9949b4f080404f0697c5fd570cc84f60"}	2025-07-14 12:39:56.513527+00	1
569	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=29196ed538e754e0f2f86cc9ff2f1063&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752496944214", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752496944214", "user_balance": "1000.00", "session_token": "29196ed538e754e0f2f86cc9ff2f1063"}	2025-07-14 12:42:24.215123+00	1
570	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=e732a49c553b55c250605b68f218553e&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752497039918", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752497039918", "user_balance": "1000.00", "session_token": "e732a49c553b55c250605b68f218553e"}	2025-07-14 12:43:59.918838+00	1
571	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=7b3aff7d7ae3dd202867d4980782cd45&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752497073006", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752497073006", "user_balance": "1000.00", "session_token": "7b3aff7d7ae3dd202867d4980782cd45"}	2025-07-14 12:44:33.007041+00	1
572	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=43cc29a2af2fcf45f64d8cbf1c33f91d&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752497077934", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752497077934", "user_balance": "1000.00", "session_token": "43cc29a2af2fcf45f64d8cbf1c33f91d"}	2025-07-14 12:44:37.934314+00	1
573	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=fb9cc38fa2812882cbe9178216bb0a07&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752497093520", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752497093520", "user_balance": "1000.00", "session_token": "fb9cc38fa2812882cbe9178216bb0a07"}	2025-07-14 12:44:53.520972+00	1
574	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=4500d0a9dd35599a6ba33731aac9f6d1&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752497176899", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752497176899", "user_balance": "1000.00", "session_token": "4500d0a9dd35599a6ba33731aac9f6d1"}	2025-07-14 12:46:16.899245+00	1
575	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=03196187889ffee8712f71fea478dd35&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752497307850", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752497307850", "user_balance": "1000.00", "session_token": "03196187889ffee8712f71fea478dd35"}	2025-07-14 12:48:27.850954+00	1
576	24	login	auth	User logged in	2001:d08:2188:ce0e:a892:e60:ba8c:779a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-14 12:51:24.815897+00	1
577	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=1602a6f56801018ab8d973fc46ab4e2d&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752497490488", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752497490488", "user_balance": "1000.00", "session_token": "1602a6f56801018ab8d973fc46ab4e2d"}	2025-07-14 12:51:30.488462+00	1
578	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=db6249b10e8a239133248a4c864fe25d&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752497514365", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752497514365", "user_balance": "1000.00", "session_token": "db6249b10e8a239133248a4c864fe25d"}	2025-07-14 12:51:54.365619+00	1
579	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=da7743128471fd1761526e83d239da87&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752497740095", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752497740095", "user_balance": "1000.00", "session_token": "da7743128471fd1761526e83d239da87"}	2025-07-14 12:55:40.095667+00	1
580	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=ec40bb40195bbc67ef38d74930294523&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752497773030", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752497773030", "user_balance": "1000.00", "session_token": "ec40bb40195bbc67ef38d74930294523"}	2025-07-14 12:56:13.030922+00	1
581	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=969ef1763656cc2dd7f8f7257c1d77b1&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752497842503", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752497842503", "user_balance": "1000.00", "session_token": "969ef1763656cc2dd7f8f7257c1d77b1"}	2025-07-14 12:57:22.503969+00	1
734	1	login	auth	User logged in	202.144.203.50	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-22 10:54:06.601303+00	1
582	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=29ba8ef0d2ca357e1bfbe9594d231296&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752497895203", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752497895203", "user_balance": "1000.00", "session_token": "29ba8ef0d2ca357e1bfbe9594d231296"}	2025-07-14 12:58:15.203956+00	1
583	1	login	auth	User logged in	2001:e68:542f:645a:6c3b:2b06:ffd3:1d8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 13:00:13.553378+00	1
584	1	place_bet	gaming	Placed bet on game	\N	\N	\N	{"bet_id": 2, "game_id": 53, "bet_amount": 100}	2025-07-14 13:00:35.725371+00	1
585	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=2609eeb8547ff4d29d2ac20f6b636c76&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752498077454", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752498077454", "user_balance": "1000.00", "session_token": "2609eeb8547ff4d29d2ac20f6b636c76"}	2025-07-14 13:01:17.454819+00	1
586	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=6526ee1c698bfa9700f8fd4fe2d17560&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752498292504", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752498292504", "user_balance": "1000.00", "session_token": "6526ee1c698bfa9700f8fd4fe2d17560"}	2025-07-14 13:04:52.504528+00	1
587	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=38bef5e1430fa78d0ab51a8902b61fb3&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752498333648", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752498333648", "user_balance": "1000.00", "session_token": "38bef5e1430fa78d0ab51a8902b61fb3"}	2025-07-14 13:05:33.64839+00	1
588	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=9c4f709eb628a545aa9e8f17264193c1&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752498422265", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752498422265", "user_balance": "1000.00", "session_token": "9c4f709eb628a545aa9e8f17264193c1"}	2025-07-14 13:07:02.26587+00	1
589	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=12840212bf5db7e07f658666e76ce70c&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752498496558", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752498496558", "user_balance": "1000.00", "session_token": "12840212bf5db7e07f658666e76ce70c"}	2025-07-14 13:08:16.558547+00	1
590	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=df9eca4d4a5ebbd25cd62f0ba31a3fdb&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752498559140", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752498559140", "user_balance": "1000.00", "session_token": "df9eca4d4a5ebbd25cd62f0ba31a3fdb"}	2025-07-14 13:09:19.14487+00	1
591	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=ed6b979d42f2488fc203ebbc1c6204e4&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752498644510", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752498644510", "user_balance": "1000.00", "session_token": "ed6b979d42f2488fc203ebbc1c6204e4"}	2025-07-14 13:10:44.510593+00	1
592	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=0937d004e7de18d024b306e395688549&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752498905839", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752498905839", "user_balance": "1000.00", "session_token": "0937d004e7de18d024b306e395688549"}	2025-07-14 13:15:05.840046+00	1
593	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=f6d6b8d113baec675ab3cd09184e75cf&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752498993477", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752498993477", "user_balance": "1000.00", "session_token": "f6d6b8d113baec675ab3cd09184e75cf"}	2025-07-14 13:16:33.478101+00	1
594	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=1f8a90e449ffaf41675672218d3b43f8&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752499116369", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752499116369", "user_balance": "1000.00", "session_token": "1f8a90e449ffaf41675672218d3b43f8"}	2025-07-14 13:18:36.369999+00	1
595	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=a6d8a78d41265212817bb15395164f15&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752499167228", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752499167228", "user_balance": "1000.00", "session_token": "a6d8a78d41265212817bb15395164f15"}	2025-07-14 13:19:27.22829+00	1
596	1	login	auth	User logged in	2001:e68:542f:645a:6c3b:2b06:ffd3:1d8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 13:38:08.748079+00	1
597	1	login	auth	User logged in	2001:e68:542f:645a:6c3b:2b06:ffd3:1d8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 13:39:53.226918+00	1
598	24	login	auth	User logged in	2001:d08:2188:ce0e:614c:f136:a5bc:3d94	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-14 13:42:47.182548+00	1
599	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=e8dbe1aae221986d03e9a5c7b66bc743&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752500580095", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752500580095", "user_balance": "1000.00", "session_token": "e8dbe1aae221986d03e9a5c7b66bc743"}	2025-07-14 13:43:00.09659+00	1
600	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=ce858775838f425d5d7123cbb031e621&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752500580103", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752500580103", "user_balance": "1000.00", "session_token": "ce858775838f425d5d7123cbb031e621"}	2025-07-14 13:43:00.104186+00	1
601	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=ea625d07fbb1d4b1850e79de79e75413&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752500635565", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752500635565", "user_balance": "1000.00", "session_token": "ea625d07fbb1d4b1850e79de79e75413"}	2025-07-14 13:43:55.566297+00	1
602	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=00ce448c1cbe447e027957692721a1fa&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752500671142", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752500671142", "user_balance": "1000.00", "session_token": "00ce448c1cbe447e027957692721a1fa"}	2025-07-14 13:44:31.142809+00	1
603	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=0cc442410faa19776c166e72b08b14a4&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752500776528", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752500776528", "user_balance": "1000.00", "session_token": "0cc442410faa19776c166e72b08b14a4"}	2025-07-14 13:46:16.529123+00	1
604	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=cf8c19cb3fe5cbef771a751c6feff22a&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752500836190", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752500836190", "user_balance": "1000.00", "session_token": "cf8c19cb3fe5cbef771a751c6feff22a"}	2025-07-14 13:47:16.190293+00	1
605	1	login	auth	User logged in	2001:e68:542f:645a:6c3b:2b06:ffd3:1d8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 13:48:47.957466+00	1
606	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=a50a29c176f6f680f9fcf22c54baab8f&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752500930607", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752500930607", "user_balance": "1000.00", "session_token": "a50a29c176f6f680f9fcf22c54baab8f"}	2025-07-14 13:48:50.608414+00	1
607	1	place_bet	gaming	Placed bet on game	\N	\N	\N	{"bet_id": 3, "game_id": 53, "category": "tablegame", "bet_amount": 100}	2025-07-14 13:53:42.912461+00	1
608	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=84074088e1b344245812c3e9d2efc1a2&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752501238124", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752501238124", "user_balance": "1000.00", "session_token": "84074088e1b344245812c3e9d2efc1a2"}	2025-07-14 13:53:58.125005+00	1
609	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=b4ddcf38ebc308077ca71bb258c1de29&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752501358986", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752501358986", "user_balance": "1000.00", "session_token": "b4ddcf38ebc308077ca71bb258c1de29"}	2025-07-14 13:55:58.987448+00	1
611	1	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=00fa83293f5f3172b33d54d51cfb1534&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_41_1752501858391", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_id": "1_41_1752501858391", "user_balance": "0.00", "session_token": "00fa83293f5f3172b33d54d51cfb1534"}	2025-07-14 14:04:18.392057+00	1
612	1	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=a80331c07b7c63ff1b71bf88c679fc1c&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_41_1752501858450", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_id": "1_41_1752501858450", "user_balance": "0.00", "session_token": "a80331c07b7c63ff1b71bf88c679fc1c"}	2025-07-14 14:04:18.450842+00	1
613	24	login	auth	User logged in	2001:e68:542f:645a:6c3b:2b06:ffd3:1d8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 14:06:23.393821+00	1
614	24	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=34e6ba81ffb1ead6a46afe3857965a65&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_58_1752501987552", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_id": "24_58_1752501987552", "user_balance": "1000.00", "session_token": "34e6ba81ffb1ead6a46afe3857965a65"}	2025-07-14 14:06:27.552684+00	1
615	1	login	auth	User logged in	2001:d08:2188:ce0e:614c:f136:a5bc:3d94	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-14 14:13:18.194268+00	1
616	1	place_bet	gaming	Placed bet on game	\N	\N	\N	{"bet_id": 4, "game_id": 53, "category": "tablegame", "bet_amount": 100}	2025-07-14 14:15:29.67014+00	1
617	1	login	auth	User logged in	2001:d08:2188:ce0e:614c:f136:a5bc:3d94	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-14 14:18:09.021969+00	1
618	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=655848be738fea19b9e686f1842ecb29&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_39_1752502944763", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752502944763", "user_balance": "0.00", "session_token": "655848be738fea19b9e686f1842ecb29"}	2025-07-14 14:22:24.763714+00	1
619	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=85ec0f2e4869975113e20c958952a958&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_39_1752502944768", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752502944768", "user_balance": "0.00", "session_token": "85ec0f2e4869975113e20c958952a958"}	2025-07-14 14:22:24.76875+00	1
620	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=33ee81c4d37ec068d3318015b9764e6f&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_39_1752502991355", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752502991355", "user_balance": "0.00", "session_token": "33ee81c4d37ec068d3318015b9764e6f"}	2025-07-14 14:23:11.355731+00	1
621	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=5502cd311a0cd9820425fa0402865301&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_39_1752502991392", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752502991392", "user_balance": "0.00", "session_token": "5502cd311a0cd9820425fa0402865301"}	2025-07-14 14:23:11.39248+00	1
622	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=f57caaa8af61986323807ea75e69103e&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_51_1752503233405", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1752503233405", "user_balance": "0.00", "session_token": "f57caaa8af61986323807ea75e69103e"}	2025-07-14 14:27:13.40618+00	1
623	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=5c601047b1396ba77947bd55f0feccc1&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_51_1752503233472", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1752503233472", "user_balance": "0.00", "session_token": "5c601047b1396ba77947bd55f0feccc1"}	2025-07-14 14:27:13.472714+00	1
624	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=42bfa8c9dcaead7a89ef1f41b70663a3&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_51_1752503500693", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1752503500693", "user_balance": "0.00", "session_token": "42bfa8c9dcaead7a89ef1f41b70663a3"}	2025-07-14 14:31:40.693522+00	1
735	1	login	auth	User logged in	2001:e68:542f:645a:d5d4:5f1e:c3b5:5a0c	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/137.0.7151.79 Mobile/15E148 Safari/604.1	\N	\N	2025-07-22 11:11:12.776496+00	1
740	1	login	auth	User logged in	2001:e68:542f:645a:dd60:acf0:23bd:efff	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-22 12:29:38.446295+00	1
625	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=9e6396b66bdf159418a49309d5bd6cef&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_51_1752503560049", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1752503560049", "user_balance": "0.00", "session_token": "9e6396b66bdf159418a49309d5bd6cef"}	2025-07-14 14:32:40.049989+00	1
626	1	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=bfa2c3d3ff685fc355201248aa7607f2&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_56_1752503576964", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "1_56_1752503576964", "user_balance": "0.00", "session_token": "bfa2c3d3ff685fc355201248aa7607f2"}	2025-07-14 14:32:56.964687+00	1
627	1	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=16875622302e9636bd8ee007a6100245&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_56_1752503576966", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "1_56_1752503576966", "user_balance": "0.00", "session_token": "16875622302e9636bd8ee007a6100245"}	2025-07-14 14:32:56.966277+00	1
628	30	login	auth	User logged in	5.12.125.116	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-14 14:43:07.859684+00	1
629	30	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=22da1cece27b8cd5089c4da921cdab44&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_39_1752504198024", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "30_39_1752504198024", "user_balance": "100000.00", "session_token": "22da1cece27b8cd5089c4da921cdab44"}	2025-07-14 14:43:18.024528+00	1
630	30	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=2b98bc8cf75f06a85519ff71cae7c135&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_51_1752504220934", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "30_51_1752504220934", "user_balance": "100000.00", "session_token": "2b98bc8cf75f06a85519ff71cae7c135"}	2025-07-14 14:43:40.934877+00	1
631	30	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=4eead97677947a6933786f85b1e180ee&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_39_1752504227204", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "30_39_1752504227204", "user_balance": "100000.00", "session_token": "4eead97677947a6933786f85b1e180ee"}	2025-07-14 14:43:47.204477+00	1
632	30	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=fdfb1e9ef9d1f1b513e0dfca4b3018f9&user_id=30&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=100000.00&session_id=30_39_1752504231586", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "30_39_1752504231586", "user_balance": "100000.00", "session_token": "fdfb1e9ef9d1f1b513e0dfca4b3018f9"}	2025-07-14 14:43:51.586498+00	1
633	24	login	auth	User logged in	2001:d08:2188:ce0e:ac6c:b64a:da94:ba5c	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1	\N	\N	2025-07-14 14:45:12.548097+00	1
634	24	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=dd78c4023604b0e81606f93ee241526d&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_40_1752504315463", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_id": "24_40_1752504315463", "user_balance": "1000.00", "session_token": "dd78c4023604b0e81606f93ee241526d"}	2025-07-14 14:45:15.464151+00	1
635	24	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=a14bf2febda2dce531b9ce7a91daf091&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_40_1752504327403", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_id": "24_40_1752504327403", "user_balance": "1000.00", "session_token": "a14bf2febda2dce531b9ce7a91daf091"}	2025-07-14 14:45:27.404129+00	1
636	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=3d4a45229cf95f0aba25cce7009865f9&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_53_1752504425249", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752504425249", "user_balance": "1000.00", "session_token": "3d4a45229cf95f0aba25cce7009865f9"}	2025-07-14 14:47:05.249421+00	1
637	24	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=a5cf4322f782170831960779e9822f69&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_53_1752504501664", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "24_53_1752504501664", "user_balance": "1000.00", "session_token": "a5cf4322f782170831960779e9822f69"}	2025-07-14 14:48:21.664671+00	1
638	1	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=096dab69ea71c25c52f8c141fa03f571&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_56_1752504579653", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "1_56_1752504579653", "user_balance": "0.00", "session_token": "096dab69ea71c25c52f8c141fa03f571"}	2025-07-14 14:49:39.653487+00	1
639	24	login	auth	User logged in	2001:d08:2188:ce0e:614c:f136:a5bc:3d94	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-14 14:50:15.12075+00	1
640	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=96ac5d3a7c45416fb76b4af4de34ae2a&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752504622624", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752504622624", "user_balance": "1000.00", "session_token": "96ac5d3a7c45416fb76b4af4de34ae2a"}	2025-07-14 14:50:22.624233+00	1
641	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=71214a6c17d604a7dddca627c70dcc71&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752504622657", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752504622657", "user_balance": "1000.00", "session_token": "71214a6c17d604a7dddca627c70dcc71"}	2025-07-14 14:50:22.657644+00	1
642	1	login	auth	User logged in	2001:e68:542f:645a:6c3b:2b06:ffd3:1d8	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-14 15:53:34.16424+00	1
643	1	login	auth	User logged in	2a02:2f04:1b7:8601:28d7:424c:82e1:bbe9	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-14 18:51:45.819862+00	1
644	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=a0501bbc65e153cd9a131f92837e2335&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_39_1752519110026", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752519110026", "user_balance": "0.00", "session_token": "a0501bbc65e153cd9a131f92837e2335"}	2025-07-14 18:51:50.026981+00	1
645	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=6fec1f9a12d80bbe4b2175ff42d1456a&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_51_1752519137661", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1752519137661", "user_balance": "0.00", "session_token": "6fec1f9a12d80bbe4b2175ff42d1456a"}	2025-07-14 18:52:17.661699+00	1
646	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=d12faabc6dcfc8a04ee396020ef35907&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_51_1752519167790", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1752519167790", "user_balance": "0.00", "session_token": "d12faabc6dcfc8a04ee396020ef35907"}	2025-07-14 18:52:47.790741+00	1
647	1	launch_game	gaming	Launched Kunoichi	\N	\N	\N	{"game_id": 52, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=42&token=7002568fd16fc50355a211c0e7bd3dc2&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_52_1752519221197", "provider": "iconix", "game_code": "42", "game_name": "Kunoichi", "session_id": "1_52_1752519221197", "user_balance": "0.00", "session_token": "7002568fd16fc50355a211c0e7bd3dc2"}	2025-07-14 18:53:41.198301+00	1
648	1	login	auth	User logged in	81.196.253.99	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	\N	2025-07-15 09:14:51.283518+00	1
649	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=9230273069538e45358f75eb13ec16ba&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_39_1752570897672", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752570897672", "user_balance": "0.00", "session_token": "9230273069538e45358f75eb13ec16ba"}	2025-07-15 09:14:57.672668+00	1
650	1	launch_game	gaming	Launched Rocketman	\N	\N	\N	{"game_id": 59, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=256&token=0c110bc629ba7a7ef5f60f436c7031f5&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=1_59_1752572174591", "provider": "iconix", "game_code": "256", "game_name": "Rocketman", "session_id": "1_59_1752572174591", "user_balance": "0.00", "session_token": "0c110bc629ba7a7ef5f60f436c7031f5"}	2025-07-15 09:36:14.591981+00	1
651	24	login	auth	User logged in	2001:d08:1201:800a:3843:20e8:4818:35af	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-15 11:00:31.046718+00	1
652	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=b97448a9f9ed5a80c9e0de4e7db465ba&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752577245785", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752577245785", "user_balance": "1000.00", "session_token": "b97448a9f9ed5a80c9e0de4e7db465ba"}	2025-07-15 11:00:45.78547+00	1
741	1	login	auth	User logged in	2001:e68:542f:645a:dd60:acf0:23bd:efff	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-22 12:36:54.350617+00	1
653	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=5ddeac1be85ad98fca8b3928f9f89020&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752577245794", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752577245794", "user_balance": "1000.00", "session_token": "5ddeac1be85ad98fca8b3928f9f89020"}	2025-07-15 11:00:45.794282+00	1
654	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=5e8b3fbc1bf35263a35f336a76f20c1c&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752577259821", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752577259821", "user_balance": "1000.00", "session_token": "5e8b3fbc1bf35263a35f336a76f20c1c"}	2025-07-15 11:00:59.82163+00	1
655	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=aeb22a977c30f3910c50fa304a2e958a&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752577345171", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752577345171", "user_balance": "1000.00", "session_token": "aeb22a977c30f3910c50fa304a2e958a"}	2025-07-15 11:02:25.171676+00	1
656	1	login	auth	User logged in	2001:e68:542f:645a:a869:e26f:95d6:14d3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-15 11:06:24.666018+00	1
657	1	login	auth	User logged in	2001:d08:1201:800a:3843:20e8:4818:35af	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-15 11:06:55.071283+00	1
658	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=b8f8908e8d4de540ed55ea4c75be662d&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752577809610", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752577809610", "user_balance": "1000.00", "session_token": "b8f8908e8d4de540ed55ea4c75be662d"}	2025-07-15 11:10:09.611127+00	1
659	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=c7e5851c18452240f89dea0778440196&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752577940403", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752577940403", "user_balance": "1000.00", "session_token": "c7e5851c18452240f89dea0778440196"}	2025-07-15 11:12:20.403676+00	1
660	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=9282c66cabf7a0f774c012b9e2c3b207&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752577946976", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752577946976", "user_balance": "1000.00", "session_token": "9282c66cabf7a0f774c012b9e2c3b207"}	2025-07-15 11:12:26.976722+00	1
661	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=dd5f800c9a8eb11d4c4c8ef596bd8899&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752578048224", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752578048224", "user_balance": "1000.00", "session_token": "dd5f800c9a8eb11d4c4c8ef596bd8899"}	2025-07-15 11:14:08.224835+00	1
662	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=d5909662ed6ab5a00be529c1c9dc5119&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752578318710", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752578318710", "user_balance": "1000.00", "session_token": "d5909662ed6ab5a00be529c1c9dc5119"}	2025-07-15 11:18:38.71034+00	1
663	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=31145645c129d4c6913617a858c4abc9&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752578321386", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752578321386", "user_balance": "1000.00", "session_token": "31145645c129d4c6913617a858c4abc9"}	2025-07-15 11:18:41.387206+00	1
664	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=8dbd753066f634ba99a2d0097efaf575&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752578404734", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752578404734", "user_balance": "1000.00", "session_token": "8dbd753066f634ba99a2d0097efaf575"}	2025-07-15 11:20:04.735184+00	1
665	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=e724b73fd2840c14b9981e34a36be08f&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752578410318", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752578410318", "user_balance": "1000.00", "session_token": "e724b73fd2840c14b9981e34a36be08f"}	2025-07-15 11:20:10.31858+00	1
666	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=6becd369a549d8b55e1c32c0e0ec7391&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752578614326", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752578614326", "user_balance": "1000.00", "session_token": "6becd369a549d8b55e1c32c0e0ec7391"}	2025-07-15 11:23:34.326797+00	1
667	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=596c92b020194411fe3f5581c2597202&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752578666081", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752578666081", "user_balance": "1000.00", "session_token": "596c92b020194411fe3f5581c2597202"}	2025-07-15 11:24:26.082226+00	1
668	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=7bfe6486e826f46f1615585e13f53854&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752578756701", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752578756701", "user_balance": "1000.00", "session_token": "7bfe6486e826f46f1615585e13f53854"}	2025-07-15 11:25:56.701741+00	1
669	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=7ab04b95fc121556d1d92761b380470a&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752578992764", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752578992764", "user_balance": "1000.00", "session_token": "7ab04b95fc121556d1d92761b380470a"}	2025-07-15 11:29:52.764395+00	1
670	24	launch_game	gaming	Launched Immersive Roulette	\N	\N	\N	{"game_id": 56, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=49&token=0ceff09bbf520080b114efd6b4e5fed5&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_56_1752579054213", "provider": "iconix", "game_code": "49", "game_name": "Immersive Roulette", "session_id": "24_56_1752579054213", "user_balance": "1000.00", "session_token": "0ceff09bbf520080b114efd6b4e5fed5"}	2025-07-15 11:30:54.213348+00	1
671	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=37af406d874fe5b4a235ffe8402592b3&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_51_1752580031415", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752580031415", "user_balance": "1000.00", "session_token": "37af406d874fe5b4a235ffe8402592b3"}	2025-07-15 11:47:11.416707+00	1
672	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=4e135f5fccf9577cd475b3c7303bb5ee&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_51_1752580031417", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752580031417", "user_balance": "1000.00", "session_token": "4e135f5fccf9577cd475b3c7303bb5ee"}	2025-07-15 11:47:11.417672+00	1
673	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=2578866ec3f185033885372b5627afc9&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752580048046", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752580048046", "user_balance": "1000.00", "session_token": "2578866ec3f185033885372b5627afc9"}	2025-07-15 11:47:28.046588+00	1
674	24	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=d7a0b0cf8937d3bb7307e66c42502917&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_39_1752580048053", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "24_39_1752580048053", "user_balance": "1000.00", "session_token": "d7a0b0cf8937d3bb7307e66c42502917"}	2025-07-15 11:47:28.054097+00	1
675	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=06ec8e533e510f783381c39ac2a39194&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_51_1752580085278", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752580085278", "user_balance": "1000.00", "session_token": "06ec8e533e510f783381c39ac2a39194"}	2025-07-15 11:48:05.278779+00	1
676	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=7ee5471496ae6a0d2e0636e62ec1b0d8&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_51_1752580085282", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752580085282", "user_balance": "1000.00", "session_token": "7ee5471496ae6a0d2e0636e62ec1b0d8"}	2025-07-15 11:48:05.282349+00	1
677	24	login	auth	User logged in	2001:d08:1201:800a:3843:20e8:4818:35af	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-15 12:18:11.755517+00	1
736	1	login	auth	User logged in	202.144.203.48	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-22 12:03:36.172024+00	1
678	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=ec046c80fe394633bbb1462b201a21d6&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_51_1752581895826", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752581895826", "user_balance": "1000.00", "session_token": "ec046c80fe394633bbb1462b201a21d6"}	2025-07-15 12:18:15.826337+00	1
679	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=c34fdffe0ef8148aa67966191b9fdf1a&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_51_1752582000375", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752582000375", "user_balance": "1000.00", "session_token": "c34fdffe0ef8148aa67966191b9fdf1a"}	2025-07-15 12:20:00.376868+00	1
680	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=93634c66de6d4cfaa57695175e9cccde&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_51_1752582233315", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752582233315", "user_balance": "1000.00", "session_token": "93634c66de6d4cfaa57695175e9cccde"}	2025-07-15 12:23:53.316858+00	1
681	24	login	auth	User logged in	2001:d08:1201:800a:3843:20e8:4818:35af	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-15 12:25:42.090713+00	1
682	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=fd69e2466571fb12f323b40cccabb5c1&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=990.00&session_id=24_51_1752582399032", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752582399032", "user_balance": "990.00", "session_token": "fd69e2466571fb12f323b40cccabb5c1"}	2025-07-15 12:26:39.033079+00	1
683	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=079dfbead1ab99faa222b2704a38e550&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=990.00&session_id=24_51_1752582472424", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752582472424", "user_balance": "990.00", "session_token": "079dfbead1ab99faa222b2704a38e550"}	2025-07-15 12:27:52.424343+00	1
684	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=84487e2da83360427f72d801ac712a70&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=980.00&session_id=24_51_1752582501985", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752582501985", "user_balance": "980.00", "session_token": "84487e2da83360427f72d801ac712a70"}	2025-07-15 12:28:21.985327+00	1
685	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=5e53b3780d49f9f4a778642d470312c6&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=979.00&session_id=24_51_1752582850536", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752582850536", "user_balance": "979.00", "session_token": "5e53b3780d49f9f4a778642d470312c6"}	2025-07-15 12:34:10.536181+00	1
686	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=6f2e9a8b9f13df808f1f1bbff0827454&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=978.00&session_id=24_51_1752583148880", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752583148880", "user_balance": "978.00", "session_token": "6f2e9a8b9f13df808f1f1bbff0827454"}	2025-07-15 12:39:08.880913+00	1
687	24	login	auth	User logged in	2001:d08:1201:800a:3843:20e8:4818:35af	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-15 13:20:28.8116+00	1
688	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=8c683e231074cb0a3f3cf02d730d093d&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=977.00&session_id=24_51_1752585633037", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752585633037", "user_balance": "977.00", "session_token": "8c683e231074cb0a3f3cf02d730d093d"}	2025-07-15 13:20:33.038055+00	1
689	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=1b205880ed5e2cf38b68afe71c7679b7&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=977.00&session_id=24_51_1752585687434", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752585687434", "user_balance": "977.00", "session_token": "1b205880ed5e2cf38b68afe71c7679b7"}	2025-07-15 13:21:27.434308+00	1
690	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=ee90685fb81454965d37e4a2f862a621&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_51_1752586075141", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752586075141", "user_balance": "0.00", "session_token": "ee90685fb81454965d37e4a2f862a621"}	2025-07-15 13:27:55.141555+00	1
691	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=c626336565419407617b939503777be9&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_51_1752586840119", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752586840119", "user_balance": "0.00", "session_token": "c626336565419407617b939503777be9"}	2025-07-15 13:40:40.119786+00	1
692	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=da50497307caad42eb8c517329a5b8cc&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_51_1752586849795", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752586849795", "user_balance": "0.00", "session_token": "da50497307caad42eb8c517329a5b8cc"}	2025-07-15 13:40:49.796075+00	1
693	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=62b604420efd423c4b67dac74986ce2f&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_51_1752587171828", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752587171828", "user_balance": "0.00", "session_token": "62b604420efd423c4b67dac74986ce2f"}	2025-07-15 13:46:11.82884+00	1
694	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=2652214ae4e5077d1b564df283fa0d1c&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_51_1752587175198", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752587175198", "user_balance": "0.00", "session_token": "2652214ae4e5077d1b564df283fa0d1c"}	2025-07-15 13:46:15.198563+00	1
695	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=c4b848bbc2d92f159d4440673c1278ec&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_51_1752587276173", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752587276173", "user_balance": "0.00", "session_token": "c4b848bbc2d92f159d4440673c1278ec"}	2025-07-15 13:47:56.173501+00	1
696	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=048b0dead6ed58cb0461e6da8c52f915&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_51_1752587668494", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752587668494", "user_balance": "0.00", "session_token": "048b0dead6ed58cb0461e6da8c52f915"}	2025-07-15 13:54:28.494877+00	1
697	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=6eab3b5a0207a3564793b59da42867af&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=0.00&session_id=24_51_1752588568720", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752588568720", "user_balance": "0.00", "session_token": "6eab3b5a0207a3564793b59da42867af"}	2025-07-15 14:09:28.720955+00	1
698	24	login	auth	User logged in	2001:d08:1201:800a:3843:20e8:4818:35af	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-15 14:12:28.679986+00	1
699	24	login	auth	User logged in	2001:d08:1201:800a:3843:20e8:4818:35af	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-15 14:13:21.678771+00	1
700	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=04cb63b16f6c2f501f6ec36c0667f464&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=1000.00&session_id=24_51_1752588868669", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752588868669", "user_balance": "1000.00", "session_token": "04cb63b16f6c2f501f6ec36c0667f464"}	2025-07-15 14:14:28.66922+00	1
701	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=f8e55d3f1f000d6b2352c478c322d689&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=990.00&session_id=24_51_1752588896529", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752588896529", "user_balance": "990.00", "session_token": "f8e55d3f1f000d6b2352c478c322d689"}	2025-07-15 14:14:56.529407+00	1
702	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=b62b528e489ed137b4c4bbe45e342f9e&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=990.00&session_id=24_51_1752589013156", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752589013156", "user_balance": "990.00", "session_token": "b62b528e489ed137b4c4bbe45e342f9e"}	2025-07-15 14:16:53.156354+00	1
703	24	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=badc1822f53d00f37b9aae7485585082&user_id=24&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=989.00&session_id=24_51_1752589095244", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "24_51_1752589095244", "user_balance": "989.00", "session_token": "badc1822f53d00f37b9aae7485585082"}	2025-07-15 14:18:15.245184+00	1
705	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=263ee99b6a7eb42b4ea8507b0b32db4e&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=10000.00&session_id=1_51_1752589543357", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1752589543357", "user_balance": "10000.00", "session_token": "263ee99b6a7eb42b4ea8507b0b32db4e"}	2025-07-15 14:25:43.357821+00	1
706	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=df1c8598f52a495a29b62fc56c4e1751&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=10000.00&session_id=1_39_1752591091772", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752591091772", "user_balance": "10000.00", "session_token": "df1c8598f52a495a29b62fc56c4e1751"}	2025-07-15 14:51:31.772779+00	1
707	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=cdaea6bc4204f53c14cfb51623853351&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=9900.00&session_id=1_39_1752592935325", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752592935325", "user_balance": "9900.00", "session_token": "cdaea6bc4204f53c14cfb51623853351"}	2025-07-15 15:22:15.326825+00	1
708	1	login	auth	User logged in	2001:e68:542f:645a:a869:e26f:95d6:14d3	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-15 15:22:23.10875+00	1
709	1	login	auth	User logged in	202.186.85.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-16 03:41:47.528362+00	1
710	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=54f4c48604aaddbff1be52f80fb61127&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=9900.00&session_id=1_39_1752637310424", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752637310424", "user_balance": "9900.00", "session_token": "54f4c48604aaddbff1be52f80fb61127"}	2025-07-16 03:41:50.425482+00	1
711	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=cd7d91346df9a3ae5be08876d07291de&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=9800.00&session_id=1_39_1752637434763", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752637434763", "user_balance": "9800.00", "session_token": "cd7d91346df9a3ae5be08876d07291de"}	2025-07-16 03:43:54.763911+00	1
712	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=441a32f51aa27b5353351adafde34a13&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=9800.00&session_id=1_39_1752637485948", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752637485948", "user_balance": "9800.00", "session_token": "441a32f51aa27b5353351adafde34a13"}	2025-07-16 03:44:45.948412+00	1
713	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=1b98e669fce23551f079ae3c903d064b&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fbackend.jackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Fprovider-callback&balance=9800.00&session_id=1_39_1752638086062", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1752638086062", "user_balance": "9800.00", "session_token": "1b98e669fce23551f079ae3c903d064b"}	2025-07-16 03:54:46.062665+00	1
714	1	login	auth	User logged in	202.186.85.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-16 03:56:26.195194+00	1
716	1	launch_game	gaming	Launched Kunoichi	\N	\N	\N	{"game_id": 52, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=42&token=1c789807eade21130144d14cb9359f2e&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=9800.00&session_id=1_52_1753163227608", "provider": "iconix", "game_code": "42", "game_name": "Kunoichi", "session_id": "1_52_1753163227608", "user_balance": "9800.00", "session_token": "1c789807eade21130144d14cb9359f2e"}	2025-07-22 05:47:07.611151+00	1
718	1	launch_game	gaming	Launched Kunoichi	\N	\N	\N	{"game_id": 52, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=42&token=1be7e189f2f8751f5af8f6ebd5610913&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.70&session_id=1_52_1753163495628", "provider": "iconix", "game_code": "42", "game_name": "Kunoichi", "session_id": "1_52_1753163495628", "user_balance": "1005.70", "session_token": "1be7e189f2f8751f5af8f6ebd5610913"}	2025-07-22 05:51:35.62911+00	1
721	1	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=aa47eb3ec3ff2078bed17dcc17380079&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.80&session_id=1_41_1753172236055", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_id": "1_41_1753172236055", "user_balance": "1005.80", "session_token": "aa47eb3ec3ff2078bed17dcc17380079"}	2025-07-22 08:17:16.056162+00	1
723	1	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=567c74b6c12c19f9ad0684d68f5c0aa1&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.80&session_id=1_41_1753172836373", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_id": "1_41_1753172836373", "user_balance": "1005.80", "session_token": "567c74b6c12c19f9ad0684d68f5c0aa1"}	2025-07-22 08:27:16.374867+00	1
717	1	launch_game	gaming	Launched Kunoichi	\N	\N	\N	{"game_id": 52, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=42&token=3fc953b21d72186f50389738638eb5cf&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=9800.00&session_id=1_52_1753163369595", "provider": "iconix", "game_code": "42", "game_name": "Kunoichi", "session_id": "1_52_1753163369595", "user_balance": "9800.00", "session_token": "3fc953b21d72186f50389738638eb5cf"}	2025-07-22 05:49:29.596109+00	1
719	1	login	auth	User logged in	202.186.117.125	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-22 05:56:02.781238+00	1
722	1	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=4cebabb1e5a7bf6deb78b1e744e2dce2&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.80&session_id=1_41_1753172333986", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_id": "1_41_1753172333986", "user_balance": "1005.80", "session_token": "4cebabb1e5a7bf6deb78b1e744e2dce2"}	2025-07-22 08:18:53.987531+00	1
724	1	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=d07fd871dd5462b343c93b9b684fdb32&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.80&session_id=1_41_1753172892819", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_id": "1_41_1753172892819", "user_balance": "1005.80", "session_token": "d07fd871dd5462b343c93b9b684fdb32"}	2025-07-22 08:28:12.820318+00	1
725	1	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=450d71917e86f015b2b81a85fc812829&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.80&session_id=1_42_1753172989267", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_id": "1_42_1753172989267", "user_balance": "1005.80", "session_token": "450d71917e86f015b2b81a85fc812829"}	2025-07-22 08:29:49.268184+00	1
726	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=dc0271bacbd27867467504caab7c68ed&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.80&session_id=1_43_1753173074177", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_id": "1_43_1753173074177", "user_balance": "1005.80", "session_token": "dc0271bacbd27867467504caab7c68ed"}	2025-07-22 08:31:14.178313+00	1
727	1	login	auth	User logged in	202.186.117.125	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-22 08:31:19.148535+00	1
728	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=b675b615291c20c013cb80a254e48cdd&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.80&session_id=1_43_1753173099981", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_id": "1_43_1753173099981", "user_balance": "1005.80", "session_token": "b675b615291c20c013cb80a254e48cdd"}	2025-07-22 08:31:39.982641+00	1
729	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=d4c139798455774e4254e657e9fe34c7&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.80&session_id=1_43_1753174041088", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_id": "1_43_1753174041088", "user_balance": "1005.80", "session_token": "d4c139798455774e4254e657e9fe34c7"}	2025-07-22 08:47:21.089787+00	1
730	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=39c71baba2cf5ce9e09276d7e0b7e03d&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.80&session_id=1_43_1753174229576", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_id": "1_43_1753174229576", "user_balance": "1005.80", "session_token": "39c71baba2cf5ce9e09276d7e0b7e03d"}	2025-07-22 08:50:29.578109+00	1
731	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=399db9707203e3fd048b90165693d277&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.80&session_id=1_43_1753174680488", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_id": "1_43_1753174680488", "user_balance": "1005.80", "session_token": "399db9707203e3fd048b90165693d277"}	2025-07-22 08:58:00.490075+00	1
737	1	login	auth	User logged in	2001:e68:542f:645a:dd60:acf0:23bd:efff	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-22 12:22:32.209247+00	1
738	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=e8b608df41c2e3dd21e56f3c595493dd&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.80&session_id=1_43_1753186972116", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_id": "1_43_1753186972116", "user_balance": "1005.80", "session_token": "e8b608df41c2e3dd21e56f3c595493dd"}	2025-07-22 12:22:52.124176+00	1
739	1	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=84d8b78bbc3a383520e087557d7e8e3b&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.80&session_id=1_43_1753187109362", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_id": "1_43_1753187109362", "user_balance": "1005.80", "session_token": "84d8b78bbc3a383520e087557d7e8e3b"}	2025-07-22 12:25:09.363455+00	1
757	1	login	auth	User logged in	2001:e68:542f:645a:dd60:acf0:23bd:efff	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-22 14:24:48.905536+00	1
742	1	launch_game	gaming	Launched Kunoichi	\N	\N	\N	{"game_id": 52, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=42&token=22f9b9af50237783636842f01d4389a5&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.80&session_id=1_52_1753187832214", "provider": "iconix", "game_code": "42", "game_name": "Kunoichi", "session_id": "1_52_1753187832214", "user_balance": "1005.80", "session_token": "22f9b9af50237783636842f01d4389a5"}	2025-07-22 12:37:12.215131+00	1
743	1	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=06b642a15bb779a6ddd1103c834c2ba0&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1005.90&session_id=1_41_1753190239018", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_id": "1_41_1753190239018", "user_balance": "1005.90", "session_token": "06b642a15bb779a6ddd1103c834c2ba0"}	2025-07-22 13:17:19.018693+00	1
744	1	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=25d66d2177f2963387a73929848d2c5a&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1006.30&session_id=1_42_1753190311099", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_id": "1_42_1753190311099", "user_balance": "1006.30", "session_token": "25d66d2177f2963387a73929848d2c5a"}	2025-07-22 13:18:31.100407+00	1
745	1	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=2acf60a316cce996a7ae1eeaae6d16a8&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1006.30&session_id=1_42_1753190344510", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_id": "1_42_1753190344510", "user_balance": "1006.30", "session_token": "2acf60a316cce996a7ae1eeaae6d16a8"}	2025-07-22 13:19:04.510727+00	1
746	1	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=e865d6755bbffc091c7da37a1dc3ebb3&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1006.30&session_id=1_41_1753190477948", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_id": "1_41_1753190477948", "user_balance": "1006.30", "session_token": "e865d6755bbffc091c7da37a1dc3ebb3"}	2025-07-22 13:21:17.949499+00	1
747	1	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=c2958cc4fa1971c579f8ab9e930fb6cf&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1006.75&session_id=1_42_1753190504825", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_id": "1_42_1753190504825", "user_balance": "1006.75", "session_token": "c2958cc4fa1971c579f8ab9e930fb6cf"}	2025-07-22 13:21:44.826432+00	1
748	1	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=b64626a28be852560ece094e5c6ef538&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1006.75&session_id=1_42_1753190992465", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_id": "1_42_1753190992465", "user_balance": "1006.75", "session_token": "b64626a28be852560ece094e5c6ef538"}	2025-07-22 13:29:52.467464+00	1
749	1	login	auth	User logged in	86.125.117.27	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-22 14:00:08.043686+00	1
750	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=366e37467ef31aafb5f26c995b14ed7e&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1006.75&session_id=1_51_1753192957524", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1753192957524", "user_balance": "1006.75", "session_token": "366e37467ef31aafb5f26c995b14ed7e"}	2025-07-22 14:02:37.525661+00	1
751	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=0f49eb0c415eed81dc3235b4e28463cc&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1011.33&session_id=1_51_1753193142111", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1753193142111", "user_balance": "1011.33", "session_token": "0f49eb0c415eed81dc3235b4e28463cc"}	2025-07-22 14:05:42.112343+00	1
752	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=7ebbe12b8060dd1e4540853180fd055b&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1016.84&session_id=1_51_1753193396825", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1753193396825", "user_balance": "1016.84", "session_token": "7ebbe12b8060dd1e4540853180fd055b"}	2025-07-22 14:09:56.826279+00	1
753	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=f138972a090c75d2556c01cd65466a27&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1016.84&session_id=1_51_1753193401310", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1753193401310", "user_balance": "1016.84", "session_token": "f138972a090c75d2556c01cd65466a27"}	2025-07-22 14:10:01.311748+00	1
754	1	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=cde7019eff2a1b9ce1d8022573a10007&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1016.84&session_id=1_51_1753193418278", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "1_51_1753193418278", "user_balance": "1016.84", "session_token": "cde7019eff2a1b9ce1d8022573a10007"}	2025-07-22 14:10:18.279163+00	1
755	24	login	auth	User logged in	2001:d08:1c31:df2b:60b4:42fc:7444:89a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-22 14:15:07.609462+00	1
756	24	login	auth	User logged in	2001:d08:1c31:df2b:60b4:42fc:7444:89a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-22 14:18:37.22517+00	1
758	1	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=f401c0c39f2fa5e2febf955f9dd045db&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1016.89&session_id=1_42_1753194304573", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_id": "1_42_1753194304573", "user_balance": "1016.89", "session_token": "f401c0c39f2fa5e2febf955f9dd045db"}	2025-07-22 14:25:04.574251+00	1
759	2	login	auth	User logged in	2001:e68:542f:645a:dd60:acf0:23bd:efff	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-22 14:34:14.202062+00	1
760	2	launch_game	gaming	Launched Horror Circus	\N	\N	\N	{"game_id": 51, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=40&token=11ca7ba8d734f2f12ade7b287c749cb3&user_id=2&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=100.00&session_id=2_51_1753194861492", "provider": "iconix", "game_code": "40", "game_name": "Horror Circus", "session_id": "2_51_1753194861492", "user_balance": "100.00", "session_token": "11ca7ba8d734f2f12ade7b287c749cb3"}	2025-07-22 14:34:21.493102+00	1
761	2	launch_game	gaming	Launched Monsters House	\N	\N	\N	{"game_id": 43, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=13&token=11aaa69454ee171d2d99e06ec2221885&user_id=2&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=100.22&session_id=2_43_1753194922096", "provider": "iconix", "game_code": "13", "game_name": "Monsters House", "session_id": "2_43_1753194922096", "user_balance": "100.22", "session_token": "11aaa69454ee171d2d99e06ec2221885"}	2025-07-22 14:35:22.096758+00	1
762	2	login	auth	User logged in	2001:e68:542f:645a:dd60:acf0:23bd:efff	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-22 14:44:09.334072+00	1
763	2	launch_game	gaming	Launched Rocketman	\N	\N	\N	{"game_id": 59, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=256&token=86daf8191ad51d5207ad8c352c401f12&user_id=2&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=100.22&session_id=2_59_1753195454342", "provider": "iconix", "game_code": "256", "game_name": "Rocketman", "session_id": "2_59_1753195454342", "user_balance": "100.22", "session_token": "86daf8191ad51d5207ad8c352c401f12"}	2025-07-22 14:44:14.343534+00	1
764	2	launch_game	gaming	Launched Dojo	\N	\N	\N	{"game_id": 49, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=30&token=33fd2e09954dcaef4e01c2f173323286&user_id=2&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=90.22&session_id=2_49_1753195522917", "provider": "iconix", "game_code": "30", "game_name": "Dojo", "session_id": "2_49_1753195522917", "user_balance": "90.22", "session_token": "33fd2e09954dcaef4e01c2f173323286"}	2025-07-22 14:45:22.918169+00	1
765	2	launch_game	gaming	Launched Dojo	\N	\N	\N	{"game_id": 49, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=30&token=e47e6951e041d1581d15217b1c0236a4&user_id=2&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=90.22&session_id=2_49_1753196193856", "provider": "iconix", "game_code": "30", "game_name": "Dojo", "session_id": "2_49_1753196193856", "user_balance": "90.22", "session_token": "e47e6951e041d1581d15217b1c0236a4"}	2025-07-22 14:56:33.857573+00	1
766	24	login	auth	User logged in	2001:d08:1c31:df2b:60b4:42fc:7444:89a	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-22 15:52:48.707416+00	1
767	1	login	auth	User logged in	2001:e68:542f:645a:a051:111:ea7:ed16	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/137 Version/11.1.1 Safari/605.1.15	\N	\N	2025-07-22 16:03:37.848379+00	1
768	1	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=aa6aae63b1218773f2647caf7d92fa8a&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1016.89&session_id=1_41_1753200226384", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_id": "1_41_1753200226384", "user_balance": "1016.89", "session_token": "aa6aae63b1218773f2647caf7d92fa8a"}	2025-07-22 16:03:46.387508+00	1
769	1	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=7a95121282d5ed745b8f07cd501ce1ca&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.09&session_id=1_40_1753200272297", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_id": "1_40_1753200272297", "user_balance": "1017.09", "session_token": "7a95121282d5ed745b8f07cd501ce1ca"}	2025-07-22 16:04:32.297547+00	1
770	1	login	auth	User logged in	2001:e68:542f:645a:a051:111:ea7:ed16	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/137 Version/11.1.1 Safari/605.1.15	\N	\N	2025-07-22 16:05:16.266891+00	1
771	1	launch_game	gaming	Launched Caesars Glory	\N	\N	\N	{"game_id": 40, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=3&token=4c7bec22fa9110632a00f638262f3d71&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.09&session_id=1_40_1753200321975", "provider": "iconix", "game_code": "3", "game_name": "Caesars Glory", "session_id": "1_40_1753200321975", "user_balance": "1017.09", "session_token": "4c7bec22fa9110632a00f638262f3d71"}	2025-07-22 16:05:21.976545+00	1
772	1	login	auth	User logged in	2001:e68:542f:645a:a051:111:ea7:ed16	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/137 Version/11.1.1 Safari/605.1.15	\N	\N	2025-07-22 16:05:56.720066+00	1
773	1	launch_game	gaming	Launched American Roulette	\N	\N	\N	{"game_id": 53, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=46&token=51ac8110a3cd9bb1f4329f31bfefcaff&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.09&session_id=1_53_1753200362841", "provider": "iconix", "game_code": "46", "game_name": "American Roulette", "session_id": "1_53_1753200362841", "user_balance": "1017.09", "session_token": "51ac8110a3cd9bb1f4329f31bfefcaff"}	2025-07-22 16:06:02.84196+00	1
774	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=f59d9f5b466b4e566e70b81202170db0&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.29&session_id=1_39_1753200394589", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1753200394589", "user_balance": "1017.29", "session_token": "f59d9f5b466b4e566e70b81202170db0"}	2025-07-22 16:06:34.589609+00	1
775	1	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=899afdbd4bdaa94ac02aeaba8a8914e4&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.29&session_id=1_42_1753200414161", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_id": "1_42_1753200414161", "user_balance": "1017.29", "session_token": "899afdbd4bdaa94ac02aeaba8a8914e4"}	2025-07-22 16:06:54.162328+00	1
776	1	launch_game	gaming	Launched Naga King	\N	\N	\N	{"game_id": 44, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=15&token=33eb2303a5cfb056a87cce22c89bbf51&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.29&session_id=1_44_1753200434970", "provider": "iconix", "game_code": "15", "game_name": "Naga King", "session_id": "1_44_1753200434970", "user_balance": "1017.29", "session_token": "33eb2303a5cfb056a87cce22c89bbf51"}	2025-07-22 16:07:14.970805+00	1
777	1	launch_game	gaming	Launched Zombie Escape	\N	\N	\N	{"game_id": 48, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=29&token=644e34c08a073b1f55f25ebb88a85a5e&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.29&session_id=1_48_1753200455492", "provider": "iconix", "game_code": "29", "game_name": "Zombie Escape", "session_id": "1_48_1753200455492", "user_balance": "1017.29", "session_token": "644e34c08a073b1f55f25ebb88a85a5e"}	2025-07-22 16:07:35.493134+00	1
778	1	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=86034e531c8b34ce1b8f23af3e27ab34&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.29&session_id=1_41_1753200498700", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_id": "1_41_1753200498700", "user_balance": "1017.29", "session_token": "86034e531c8b34ce1b8f23af3e27ab34"}	2025-07-22 16:08:18.700865+00	1
779	1	launch_game	gaming	Launched Sakura	\N	\N	\N	{"game_id": 45, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=18&token=1898aea88effed9be3afd0ec0cd6386f&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.69&session_id=1_45_1753200553078", "provider": "iconix", "game_code": "18", "game_name": "Sakura", "session_id": "1_45_1753200553078", "user_balance": "1017.69", "session_token": "1898aea88effed9be3afd0ec0cd6386f"}	2025-07-22 16:09:13.07944+00	1
780	1	launch_game	gaming	Launched Venice Carnival	\N	\N	\N	{"game_id": 47, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=27&token=5a45a973ec8e9c742c16fa0d2f19f168&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.69&session_id=1_47_1753200576704", "provider": "iconix", "game_code": "27", "game_name": "Venice Carnival", "session_id": "1_47_1753200576704", "user_balance": "1017.69", "session_token": "5a45a973ec8e9c742c16fa0d2f19f168"}	2025-07-22 16:09:36.705262+00	1
781	1	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=61449eea0b106feb54a69799e06fbfb1&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.69&session_id=1_42_1753200602149", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_id": "1_42_1753200602149", "user_balance": "1017.69", "session_token": "61449eea0b106feb54a69799e06fbfb1"}	2025-07-22 16:10:02.150347+00	1
782	1	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=5c537f788e5ed39353e565dba646c8c3&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.69&session_id=1_42_1753200615219", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_id": "1_42_1753200615219", "user_balance": "1017.69", "session_token": "5c537f788e5ed39353e565dba646c8c3"}	2025-07-22 16:10:15.220092+00	1
783	1	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=39fde0a917eca9b05bada3909628d648&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.69&session_id=1_42_1753200628137", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_id": "1_42_1753200628137", "user_balance": "1017.69", "session_token": "39fde0a917eca9b05bada3909628d648"}	2025-07-22 16:10:28.137655+00	1
784	1	login	auth	User logged in	2001:e68:542f:645a:a051:111:ea7:ed16	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/137 Version/11.1.1 Safari/605.1.15	\N	\N	2025-07-22 16:16:21.370507+00	1
785	1	launch_game	gaming	Launched Aztec Temple	\N	\N	\N	{"game_id": 39, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=2&token=196137193c16c6f6b21c791a0da7d0f9&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.69&session_id=1_39_1753201048621", "provider": "iconix", "game_code": "2", "game_name": "Aztec Temple", "session_id": "1_39_1753201048621", "user_balance": "1017.69", "session_token": "196137193c16c6f6b21c791a0da7d0f9"}	2025-07-22 16:17:28.621975+00	1
786	1	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=a4945f2604c3ab7a297e59f9a5c5ae7e&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.69&session_id=1_41_1753201063991", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_id": "1_41_1753201063991", "user_balance": "1017.69", "session_token": "a4945f2604c3ab7a297e59f9a5c5ae7e"}	2025-07-22 16:17:43.992368+00	1
787	1	launch_game	gaming	Launched European Roulette	\N	\N	\N	{"game_id": 58, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=51&token=28c1755b3ab77c4fed5ef5c46ca6c60c&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1017.94&session_id=1_58_1753201322826", "provider": "iconix", "game_code": "51", "game_name": "European Roulette", "session_id": "1_58_1753201322826", "user_balance": "1017.94", "session_token": "28c1755b3ab77c4fed5ef5c46ca6c60c"}	2025-07-22 16:22:02.827127+00	1
788	1	launch_game	gaming	Launched Kleopatra	\N	\N	\N	{"game_id": 42, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=11&token=db00177d3aeb94f66ed0cb70626cacdd&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1018.14&session_id=1_42_1753201386112", "provider": "iconix", "game_code": "11", "game_name": "Kleopatra", "session_id": "1_42_1753201386112", "user_balance": "1018.14", "session_token": "db00177d3aeb94f66ed0cb70626cacdd"}	2025-07-22 16:23:06.112891+00	1
789	1	login	auth	User logged in	202.144.203.50	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-22 18:04:58.570144+00	1
790	1	login	auth	User logged in	81.18.93.151	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-22 19:22:33.702243+00	1
791	1	launch_game	gaming	Launched Cyber Ninja	\N	\N	\N	{"game_id": 41, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=4&token=9fbce27e85b6fad46677a7a18e8bc3c6&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1018.14&session_id=1_41_1753212168407", "provider": "iconix", "game_code": "4", "game_name": "Cyber Ninja", "session_id": "1_41_1753212168407", "user_balance": "1018.14", "session_token": "9fbce27e85b6fad46677a7a18e8bc3c6"}	2025-07-22 19:22:48.408138+00	1
792	1	login	auth	User logged in	202.186.117.125	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-23 02:13:20.383937+00	1
793	1	login	auth	User logged in	202.186.117.125	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-23 03:59:19.020392+00	1
794	1	launch_game	gaming	Launched Legend Of Emerald	\N	\N	\N	{"game_id": 50, "currency": "USD", "play_url": "https://staging-wallet-launch1.semper7.net/?mode=real&game_id=34&token=9d51ea609946320fcc980ec5e201049f&user_id=1&currency=USD&language=en&operator_id=thinkcode_stg&home_url=https%3A%2F%2Fjackpotx.net&callback_url=https%3A%2F%2Fbackend.jackpotx.net%2Fapi%2Finnova%2F&balance=1019.09&session_id=1_50_1753243166349", "provider": "iconix", "game_code": "34", "game_name": "Legend Of Emerald", "session_id": "1_50_1753243166349", "user_balance": "1019.09", "session_token": "9d51ea609946320fcc980ec5e201049f"}	2025-07-23 03:59:26.350273+00	1
795	1	login	auth	User logged in	202.186.117.125	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-23 04:02:06.854296+00	1
796	1	login	auth	User logged in	81.18.93.151	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	\N	\N	2025-07-23 06:21:33.549275+00	1
797	24	login	auth	User logged in	2001:d08:1c31:df2b:818f:ba0b:6e0:1ccf	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-23 12:18:11.751264+00	1
798	1	login	auth	User logged in	2001:e68:542f:645a:a097:7935:bdb2:89fa	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-23 12:19:04.658929+00	1
799	24	login	auth	User logged in	2001:d08:1c31:df2b:818f:ba0b:6e0:1ccf	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-23 12:20:22.498993+00	1
800	1	login	auth	User logged in	2001:e68:542f:645a:a097:7935:bdb2:89fa	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N	\N	2025-07-23 12:24:44.606739+00	1
801	24	login	auth	User logged in	2001:d08:1c31:df2b:818f:ba0b:6e0:1ccf	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	\N	\N	2025-07-23 13:19:06.964899+00	1
\.


--
-- Data for Name: user_balances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_balances (user_id, balance, bonus_balance, locked_balance, total_deposited, total_withdrawn, total_wagered, total_won, updated_at) FROM stdin;
3	0.00	0.00	0.00	0.00	0.00	0.00	0.00	2025-07-13 04:40:35.814584+00
4	0.00	0.00	0.00	0.00	0.00	0.00	0.00	2025-07-13 04:40:35.814584+00
22	0.00	0.00	0.00	0.00	0.00	0.00	0.00	2025-07-13 04:40:35.814584+00
23	0.00	0.00	0.00	0.00	0.00	0.00	0.00	2025-07-13 04:40:35.814584+00
25	0.00	0.00	0.00	0.00	0.00	0.00	0.00	2025-07-13 04:40:35.814584+00
26	0.00	0.00	0.00	0.00	0.00	0.00	0.00	2025-07-13 04:40:35.814584+00
28	0.00	0.00	0.00	0.00	0.00	0.00	0.00	2025-07-13 04:40:35.814584+00
29	0.00	0.00	0.00	0.00	0.00	0.00	0.00	2025-07-13 04:40:35.814584+00
20	0.00	0.00	0.00	0.00	0.00	0.00	0.00	2025-07-13 04:40:35.814584+00
30	100000.00	0.00	0.00	0.00	0.00	0.00	0.00	2025-07-14 07:01:50.701327+00
27	100000.00	0.00	0.00	0.00	0.00	0.00	0.00	2025-07-14 07:04:49.026292+00
1	1019.09	0.00	0.00	1500.00	0.00	300.00	119.09	2025-07-22 19:23:02.655513+00
24	988.00	0.00	0.00	0.00	0.00	0.00	0.00	2025-07-23 12:33:57.514418+00
2	90.22	0.00	0.00	100.00	0.00	0.00	0.22	2025-07-22 14:44:23.796216+00
\.


--
-- Data for Name: user_category_balances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_category_balances (user_id, category, balance) FROM stdin;
1	tablegame	600.00
24	slots	12.00
1	slots	414.09
2	slots	10.22
2	crashgame	10.00
\.


--
-- Data for Name: user_game_bets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_game_bets (user_id, game_id, total_bet, total_win, total_loss, last_bet_at, last_result_at) FROM stdin;
1	53	100.00	0.00	0.00	2025-07-14 14:15:29.67014	\N
\.


--
-- Data for Name: user_game_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_game_preferences (id, user_id, game_id, is_favorite, play_count, total_time_played, last_played_at, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: user_level_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_level_progress (id, user_id, level_id, current_points, total_points_earned, level_achieved_at, created_at, created_by, updated_at, updated_by) FROM stdin;
1	1	1	0	0	2025-07-03 03:27:32.047524+00	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
2	2	2	1500	1500	2025-07-03 03:27:34.361467+00	2025-07-03 03:27:34.361467+00	1	2025-07-03 03:27:34.361467+00	1
3	3	1	500	500	2025-07-03 03:27:34.361467+00	2025-07-03 03:27:34.361467+00	1	2025-07-03 03:27:34.361467+00	1
4	4	1	0	0	2025-07-04 18:17:58.444107+00	2025-07-04 18:17:58.444107+00	1	2025-07-04 18:17:58.444107+00	1
5	20	1	0	0	2025-07-05 02:03:34.735386+00	2025-07-05 02:03:34.735386+00	1	2025-07-05 02:03:34.735386+00	1
6	22	1	0	0	2025-07-05 04:42:58.449756+00	2025-07-05 04:42:58.449756+00	1	2025-07-05 04:42:58.449756+00	1
7	23	1	0	0	2025-07-05 11:59:21.053628+00	2025-07-05 11:59:21.053628+00	1	2025-07-05 11:59:21.053628+00	1
8	24	1	0	0	2025-07-09 11:32:12.993721+00	2025-07-09 11:32:12.993721+00	1	2025-07-09 11:32:12.993721+00	1
9	25	1	0	0	2025-07-09 15:11:12.839679+00	2025-07-09 15:11:12.839679+00	1	2025-07-09 15:11:12.839679+00	1
10	26	1	0	0	2025-07-09 15:12:12.385975+00	2025-07-09 15:12:12.385975+00	1	2025-07-09 15:12:12.385975+00	1
11	27	1	0	0	2025-07-09 15:18:36.113158+00	2025-07-09 15:18:36.113158+00	1	2025-07-09 15:18:36.113158+00	1
12	28	1	0	0	2025-07-09 15:23:18.966678+00	2025-07-09 15:23:18.966678+00	1	2025-07-09 15:23:18.966678+00	1
13	29	1	0	0	2025-07-10 12:12:44.019906+00	2025-07-10 12:12:44.019906+00	1	2025-07-10 12:12:44.019906+00	1
14	30	1	0	0	2025-07-12 07:33:09.54405+00	2025-07-12 07:33:09.54405+00	1	2025-07-12 07:33:09.54405+00	1
\.


--
-- Data for Name: user_levels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_levels (id, name, description, min_points, max_points, benefits, cashback_percentage, withdrawal_limit, created_at, created_by, updated_at, updated_by) FROM stdin;
1	Bronze	New player level	0	999	{"Welcome bonus","Basic support"}	0.50	1000.00	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
2	Silver	Regular player	1000	4999	{"Monthly bonus","Priority support","Faster withdrawals"}	1.00	5000.00	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
3	Gold	Active player	5000	19999	{"Weekly bonus","VIP support","Exclusive games","Higher limits"}	2.00	10000.00	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
4	Platinum	High roller	20000	99999	{"Daily bonus","Personal account manager","Exclusive tournaments"}	3.00	50000.00	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
5	Diamond	VIP player	100000	\N	{"Custom bonuses","24/7 support","Private events","Luxury rewards"}	5.00	100000.00	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_profiles (id, user_id, first_name, last_name, phone_number, date_of_birth, nationality, country, city, address, postal_code, gender, avatar_url, timezone, language, currency, is_verified, verification_level, last_login_at, last_activity_at, created_at, created_by, updated_at, updated_by) FROM stdin;
1	1	Admin	User	+1234567890	\N	United States	United States	\N	\N	\N	\N	\N	UTC	en	USD	t	2	\N	\N	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1
2	2	John	Doe	+1234567891	\N	United States	United States	\N	\N	\N	\N	\N	UTC	en	USD	t	1	\N	\N	2025-07-03 03:27:34.361467+00	1	2025-07-03 03:27:34.361467+00	1
3	3	Jane	Smith	+1234567892	\N	Canada	Canada	\N	\N	\N	\N	\N	UTC	en	USD	f	0	\N	\N	2025-07-03 03:27:34.361467+00	1	2025-07-03 03:27:34.361467+00	1
4	4	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	USD	f	0	\N	\N	2025-07-04 18:17:58.444107+00	1	2025-07-04 18:17:58.444107+00	1
5	20	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	USD	f	0	\N	\N	2025-07-05 02:03:34.735386+00	1	2025-07-05 02:03:34.735386+00	1
6	22	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	USD	f	0	\N	\N	2025-07-05 04:42:58.449756+00	1	2025-07-05 04:42:58.449756+00	1
7	23	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	USD	f	0	\N	\N	2025-07-05 11:59:21.053628+00	1	2025-07-05 11:59:21.053628+00	1
9	25	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	USD	f	0	\N	\N	2025-07-09 15:11:12.839679+00	1	2025-07-09 15:11:12.839679+00	1
10	26	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	USD	f	0	\N	\N	2025-07-09 15:12:12.385975+00	1	2025-07-09 15:12:12.385975+00	1
11	27	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	USD	f	0	\N	\N	2025-07-09 15:18:36.113158+00	1	2025-07-09 15:18:36.113158+00	1
12	28	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	USD	f	0	\N	\N	2025-07-09 15:23:18.966678+00	1	2025-07-09 15:23:18.966678+00	1
13	29	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	USD	f	0	\N	\N	2025-07-10 12:12:44.019906+00	1	2025-07-10 12:12:44.019906+00	1
14	30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	UTC	en	USD	f	0	\N	\N	2025-07-12 07:33:09.54405+00	1	2025-07-12 07:33:09.54405+00	1
8	24	Amir	Mehdikhani	+172244600	\N	Iran	Malaysia	\N	\N	\N	\N	\N	UTC	en	USD	t	1	\N	\N	2025-07-09 11:32:12.993721+00	1	2025-07-14 12:09:26.53892+00	1
\.


--
-- Data for Name: user_promotions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_promotions (id, user_id, promotion_id, status, claimed_at, completed_at, bonus_amount, wagering_completed, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, user_id, role_id, created_at, created_by, updated_at, updated_by) FROM stdin;
2	2	2	2025-07-03 03:27:34.361467+00	1	2025-07-03 03:27:34.361467+00	1
3	3	2	2025-07-03 03:27:34.361467+00	1	2025-07-03 03:27:34.361467+00	1
4	4	2	2025-07-04 18:17:58.444107+00	1	2025-07-04 18:17:58.444107+00	1
5	20	2	2025-07-05 02:03:34.735386+00	1	2025-07-05 02:03:34.735386+00	1
6	22	2	2025-07-05 04:42:58.449756+00	1	2025-07-05 04:42:58.449756+00	1
7	23	2	2025-07-05 11:59:21.053628+00	1	2025-07-05 11:59:21.053628+00	1
1	1	1	2025-07-03 03:27:32.047524+00	1	2025-07-09 14:00:11.829355+00	1
9	25	2	2025-07-09 15:11:12.839679+00	1	2025-07-09 15:11:12.839679+00	1
10	26	2	2025-07-09 15:12:12.385975+00	1	2025-07-09 15:12:12.385975+00	1
11	27	2	2025-07-09 15:18:36.113158+00	1	2025-07-09 15:18:36.113158+00	1
12	28	2	2025-07-09 15:23:18.966678+00	1	2025-07-09 15:23:18.966678+00	1
13	29	2	2025-07-10 12:12:44.019906+00	1	2025-07-10 12:12:44.019906+00	1
14	30	2	2025-07-12 07:33:09.54405+00	1	2025-07-12 07:33:09.54405+00	1
8	24	5	2025-07-09 11:32:12.993721+00	1	2025-07-22 14:09:50.632564+00	1
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_sessions (id, user_id, session_id, ip_address, user_agent, device_type, browser, os, country, city, login_at, logout_at, last_activity_at, is_active, created_at, created_by, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: user_template_features; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_template_features (id, user_id, template_id, feature_id, is_enabled, custom_config, purchased_at, created_at) FROM stdin;
\.


--
-- Data for Name: user_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_templates (id, user_id, template_id, is_active, custom_config, activated_at, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password, auth_secret, qr_code, status_id, created_at, created_by, updated_at, updated_by, is_2fa_enabled) FROM stdin;
2	player1	player1@example.com	$2b$10$YQRnR/9U2NCOUFPnMT.JJ.SVi/Di4S5hzAgt0/4f3neMfmULWUKYq	\N	\N	1	2025-07-03 03:27:34.361467+00	1	2025-07-03 03:27:34.361467+00	1	f
3	player2	player2@example.com	$2b$10$YQRnR/9U2NCOUFPnMT.JJ.SVi/Di4S5hzAgt0/4f3neMfmULWUKYq	\N	\N	1	2025-07-03 03:27:34.361467+00	1	2025-07-03 03:27:34.361467+00	1	f
4	jackpotx@email.com	jackpotx@email.com	$2b$10$FFvDypf0Asu63P9lB48MZuzQtSiNuXsFp09iBU8bDm8sHzecLO5lm	\N	\N	1	2025-07-04 18:17:58.444107+00	1	2025-07-04 18:17:58.444107+00	1	f
22	player4	newuser4@email.com	$2b$10$RW6N.A3JRdwn/LIMZrKCEuD38e31H07YDc/75hR2O/vG6xZ4SpOjq	77DGV5TFW3IYEY5B	<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="200" height="200" fill="#fefefe"/><g transform="scale(4.082)"><g transform="translate(4,4)"><path fill-rule="evenodd" d="M9 0L9 1L8 1L8 2L9 2L9 1L10 1L10 2L12 2L12 1L13 1L13 0L12 0L12 1L11 1L11 0ZM16 0L16 1L15 1L15 2L14 2L14 3L15 3L15 4L14 4L14 5L13 5L13 4L12 4L12 3L8 3L8 4L9 4L9 5L8 5L8 7L9 7L9 8L6 8L6 9L5 9L5 8L0 8L0 9L5 9L5 11L2 11L2 10L1 10L1 11L2 11L2 12L1 12L1 13L0 13L0 14L2 14L2 13L3 13L3 12L5 12L5 13L4 13L4 14L3 14L3 15L0 15L0 16L2 16L2 17L3 17L3 15L7 15L7 14L8 14L8 17L7 17L7 16L4 16L4 17L5 17L5 18L4 18L4 19L5 19L5 18L6 18L6 19L7 19L7 20L5 20L5 22L4 22L4 21L3 21L3 20L2 20L2 19L3 19L3 18L2 18L2 19L0 19L0 20L1 20L1 21L0 21L0 22L1 22L1 24L0 24L0 26L2 26L2 27L1 27L1 28L0 28L0 33L1 33L1 29L3 29L3 30L2 30L2 33L3 33L3 32L4 32L4 33L7 33L7 32L8 32L8 31L9 31L9 30L8 30L8 29L9 29L9 28L11 28L11 27L12 27L12 26L13 26L13 28L14 28L14 29L15 29L15 30L14 30L14 32L13 32L13 31L12 31L12 32L13 32L13 33L12 33L12 34L11 34L11 35L10 35L10 36L8 36L8 41L9 41L9 40L10 40L10 41L12 41L12 39L14 39L14 40L13 40L13 41L14 41L14 40L15 40L15 39L14 39L14 38L17 38L17 39L16 39L16 41L17 41L17 40L18 40L18 39L19 39L19 40L20 40L20 41L21 41L21 40L22 40L22 39L23 39L23 40L24 40L24 41L25 41L25 39L26 39L26 41L28 41L28 40L29 40L29 39L30 39L30 38L27 38L27 37L28 37L28 36L29 36L29 37L30 37L30 36L32 36L32 37L31 37L31 40L32 40L32 41L38 41L38 39L40 39L40 40L41 40L41 39L40 39L40 38L38 38L38 35L41 35L41 34L38 34L38 33L41 33L41 31L39 31L39 30L40 30L40 28L41 28L41 27L40 27L40 28L39 28L39 30L38 30L38 28L37 28L37 27L33 27L33 26L34 26L34 25L33 25L33 26L32 26L32 27L30 27L30 26L31 26L31 24L33 24L33 23L32 23L32 22L33 22L33 21L34 21L34 20L35 20L35 19L36 19L36 20L37 20L37 19L39 19L39 20L40 20L40 18L41 18L41 17L39 17L39 18L38 18L38 16L41 16L41 13L40 13L40 12L41 12L41 11L39 11L39 10L41 10L41 9L40 9L40 8L39 8L39 10L38 10L38 8L37 8L37 11L36 11L36 12L35 12L35 11L32 11L32 9L31 9L31 8L33 8L33 9L34 9L34 10L36 10L36 8L35 8L35 9L34 9L34 8L33 8L33 5L31 5L31 4L30 4L30 3L33 3L33 2L31 2L31 1L29 1L29 0L28 0L28 1L27 1L27 0L26 0L26 1L23 1L23 0L20 0L20 1L22 1L22 2L18 2L18 1L17 1L17 0ZM26 1L26 2L27 2L27 3L28 3L28 2L27 2L27 1ZM17 2L17 3L16 3L16 4L17 4L17 5L14 5L14 6L13 6L13 9L10 9L10 8L9 8L9 9L10 9L10 10L9 10L9 11L8 11L8 10L7 10L7 9L6 9L6 10L7 10L7 11L6 11L6 12L8 12L8 13L9 13L9 15L11 15L11 17L9 17L9 18L10 18L10 20L9 20L9 19L8 19L8 18L7 18L7 17L6 17L6 18L7 18L7 19L8 19L8 20L9 20L9 22L10 22L10 23L9 23L9 24L7 24L7 23L6 23L6 22L7 22L7 21L6 21L6 22L5 22L5 23L4 23L4 22L3 22L3 23L2 23L2 26L4 26L4 25L5 25L5 27L2 27L2 28L4 28L4 29L5 29L5 31L4 31L4 30L3 30L3 31L4 31L4 32L5 32L5 31L6 31L6 32L7 32L7 31L6 31L6 30L7 30L7 29L6 29L6 28L7 28L7 27L8 27L8 26L7 26L7 25L9 25L9 27L11 27L11 26L12 26L12 25L13 25L13 24L15 24L15 25L14 25L14 26L16 26L16 23L17 23L17 26L20 26L20 27L25 27L25 29L24 29L24 28L23 28L23 29L22 29L22 28L21 28L21 29L22 29L22 30L20 30L20 28L19 28L19 27L14 27L14 28L17 28L17 29L16 29L16 30L18 30L18 31L16 31L16 32L17 32L17 35L15 35L15 34L16 34L16 33L15 33L15 34L14 34L14 33L13 33L13 35L11 35L11 36L10 36L10 37L9 37L9 39L10 39L10 37L11 37L11 38L14 38L14 37L15 37L15 36L16 36L16 37L17 37L17 38L18 38L18 33L20 33L20 32L19 32L19 31L21 31L21 33L22 33L22 34L20 34L20 35L22 35L22 36L19 36L19 39L20 39L20 38L21 38L21 39L22 39L22 38L23 38L23 39L24 39L24 38L26 38L26 39L27 39L27 40L28 40L28 39L27 39L27 38L26 38L26 37L27 37L27 36L28 36L28 34L30 34L30 35L32 35L32 32L30 32L30 33L29 33L29 32L28 32L28 31L29 31L29 30L30 30L30 31L32 31L32 30L33 30L33 31L37 31L37 32L39 32L39 31L37 31L37 30L34 30L34 29L35 29L35 28L34 28L34 29L33 29L33 28L30 28L30 27L28 27L28 26L30 26L30 24L31 24L31 22L30 22L30 21L32 21L32 20L33 20L33 19L35 19L35 18L36 18L36 19L37 19L37 16L38 16L38 14L39 14L39 15L40 15L40 13L39 13L39 11L38 11L38 12L37 12L37 13L36 13L36 15L35 15L35 14L34 14L34 15L35 15L35 18L34 18L34 16L33 16L33 18L32 18L32 20L28 20L28 19L29 19L29 18L30 18L30 19L31 19L31 17L32 17L32 16L31 16L31 17L29 17L29 16L28 16L28 15L29 15L29 14L30 14L30 15L32 15L32 13L33 13L33 12L31 12L31 13L30 13L30 11L31 11L31 9L29 9L29 10L28 10L28 11L27 11L27 12L26 12L26 6L25 6L25 7L24 7L24 6L23 6L23 7L22 7L22 5L24 5L24 4L25 4L25 5L26 5L26 3L25 3L25 2L24 2L24 3L23 3L23 4L22 4L22 5L20 5L20 6L19 6L19 5L18 5L18 4L20 4L20 3L18 3L18 2ZM29 2L29 3L30 3L30 2ZM10 4L10 5L9 5L9 7L10 7L10 5L11 5L11 4ZM29 4L29 5L27 5L27 8L28 8L28 6L29 6L29 8L30 8L30 6L31 6L31 7L32 7L32 6L31 6L31 5L30 5L30 4ZM17 5L17 6L16 6L16 10L15 10L15 6L14 6L14 9L13 9L13 11L12 11L12 10L10 10L10 12L14 12L14 13L15 13L15 14L14 14L14 17L15 17L15 19L14 19L14 20L15 20L15 21L14 21L14 23L15 23L15 22L17 22L17 23L18 23L18 24L20 24L20 26L22 26L22 25L23 25L23 24L24 24L24 25L25 25L25 24L24 24L24 23L28 23L28 24L26 24L26 27L27 27L27 25L28 25L28 24L29 24L29 23L30 23L30 22L29 22L29 21L28 21L28 20L27 20L27 22L25 22L25 21L24 21L24 22L23 22L23 20L26 20L26 19L27 19L27 17L28 17L28 18L29 18L29 17L28 17L28 16L27 16L27 14L28 14L28 12L29 12L29 11L30 11L30 10L29 10L29 11L28 11L28 12L27 12L27 13L26 13L26 12L25 12L25 13L26 13L26 14L24 14L24 13L21 13L21 12L24 12L24 11L25 11L25 10L24 10L24 11L23 11L23 9L22 9L22 7L21 7L21 6L20 6L20 7L19 7L19 6L18 6L18 5ZM29 5L29 6L30 6L30 5ZM11 6L11 8L12 8L12 6ZM17 6L17 8L18 8L18 6ZM23 7L23 8L24 8L24 7ZM19 8L19 9L17 9L17 10L16 10L16 11L17 11L17 10L19 10L19 11L18 11L18 12L17 12L17 13L16 13L16 14L18 14L18 15L16 15L16 17L17 17L17 18L16 18L16 19L17 19L17 20L16 20L16 21L17 21L17 22L18 22L18 23L20 23L20 22L21 22L21 24L23 24L23 23L22 23L22 22L21 22L21 20L22 20L22 19L26 19L26 17L27 17L27 16L26 16L26 15L24 15L24 14L23 14L23 15L22 15L22 14L21 14L21 13L20 13L20 12L19 12L19 11L20 11L20 10L21 10L21 11L22 11L22 10L21 10L21 9L20 9L20 8ZM19 9L19 10L20 10L20 9ZM14 11L14 12L15 12L15 11ZM6 13L6 14L7 14L7 13ZM10 13L10 14L11 14L11 13ZM12 13L12 14L13 14L13 13ZM37 13L37 14L38 14L38 13ZM19 14L19 16L17 16L17 17L18 17L18 18L17 18L17 19L19 19L19 20L17 20L17 21L19 21L19 22L20 22L20 21L19 21L19 20L20 20L20 19L21 19L21 18L23 18L23 17L22 17L22 16L21 16L21 15L20 15L20 14ZM12 15L12 16L13 16L13 15ZM23 15L23 16L24 16L24 18L25 18L25 17L26 17L26 16L24 16L24 15ZM36 15L36 16L37 16L37 15ZM19 16L19 17L20 17L20 16ZM12 18L12 19L13 19L13 18ZM10 20L10 22L11 22L11 25L10 25L10 24L9 24L9 25L10 25L10 26L11 26L11 25L12 25L12 23L13 23L13 22L11 22L11 20ZM12 20L12 21L13 21L13 20ZM1 21L1 22L2 22L2 21ZM36 21L36 22L35 22L35 23L34 23L34 24L36 24L36 25L37 25L37 26L38 26L38 27L39 27L39 26L38 26L38 25L39 25L39 24L37 24L37 23L39 23L39 22L41 22L41 21L39 21L39 22L38 22L38 21ZM36 22L36 23L37 23L37 22ZM3 23L3 25L4 25L4 23ZM40 23L40 24L41 24L41 23ZM5 24L5 25L7 25L7 24ZM6 26L6 27L7 27L7 26ZM18 28L18 30L19 30L19 28ZM27 28L27 29L26 29L26 30L24 30L24 31L23 31L23 32L22 32L22 33L23 33L23 32L24 32L24 31L26 31L26 32L25 32L25 33L26 33L26 32L27 32L27 34L28 34L28 32L27 32L27 30L28 30L28 29L30 29L30 28ZM10 29L10 32L9 32L9 33L8 33L8 35L9 35L9 33L11 33L11 29ZM12 29L12 30L13 30L13 29ZM33 33L33 36L36 36L36 33ZM24 34L24 35L23 35L23 36L22 36L22 37L21 37L21 38L22 38L22 37L23 37L23 38L24 38L24 37L25 37L25 35L26 35L26 36L27 36L27 35L26 35L26 34ZM34 34L34 35L35 35L35 34ZM14 35L14 36L15 36L15 35ZM12 36L12 37L13 37L13 36ZM23 36L23 37L24 37L24 36ZM33 37L33 38L32 38L32 39L33 39L33 40L35 40L35 39L34 39L34 37ZM35 37L35 38L36 38L36 37ZM36 39L36 40L37 40L37 39ZM0 0L0 7L7 7L7 0ZM1 1L1 6L6 6L6 1ZM2 2L2 5L5 5L5 2ZM34 0L34 7L41 7L41 0ZM35 1L35 6L40 6L40 1ZM36 2L36 5L39 5L39 2ZM0 34L0 41L7 41L7 34ZM1 35L1 40L6 40L6 35ZM2 36L2 39L5 39L5 36Z" fill="#000000"/></g></g></svg>\n	1	2025-07-05 04:42:58.449756+00	1	2025-07-05 04:42:58.449756+00	1	f
23	newuser1	newuser1@email.com	$2b$10$IIfULiXuEXEUJmqtSNrjae4tgbr.PsdyOgzbkKO5vXXQYIzOMbFJ2	Z3DVNBXEQRUPK5OV	<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="200" height="200" fill="#fefefe"/><g transform="scale(4.082)"><g transform="translate(4,4)"><path fill-rule="evenodd" d="M8 0L8 4L9 4L9 5L8 5L8 7L9 7L9 8L10 8L10 9L9 9L9 14L8 14L8 13L7 13L7 12L8 12L8 9L7 9L7 8L4 8L4 9L2 9L2 8L0 8L0 11L1 11L1 12L0 12L0 15L1 15L1 16L0 16L0 17L1 17L1 16L2 16L2 17L3 17L3 18L4 18L4 19L2 19L2 18L1 18L1 19L2 19L2 20L0 20L0 23L1 23L1 24L0 24L0 25L1 25L1 26L0 26L0 30L2 30L2 29L3 29L3 32L4 32L4 33L7 33L7 32L9 32L9 33L8 33L8 34L9 34L9 33L11 33L11 32L12 32L12 31L13 31L13 30L14 30L14 32L13 32L13 34L10 34L10 35L11 35L11 36L12 36L12 37L13 37L13 38L14 38L14 41L17 41L17 40L15 40L15 38L14 38L14 37L15 37L15 36L16 36L16 35L14 35L14 36L13 36L13 34L14 34L14 33L15 33L15 34L16 34L16 33L15 33L15 32L19 32L19 33L18 33L18 34L17 34L17 36L18 36L18 38L20 38L20 39L18 39L18 40L19 40L19 41L20 41L20 40L21 40L21 41L22 41L22 40L23 40L23 39L24 39L24 37L25 37L25 39L26 39L26 40L25 40L25 41L27 41L27 39L28 39L28 37L27 37L27 35L26 35L26 34L27 34L27 30L26 30L26 29L27 29L27 28L24 28L24 29L25 29L25 31L24 31L24 30L22 30L22 32L21 32L21 31L19 31L19 30L20 30L20 28L21 28L21 29L23 29L23 28L22 28L22 27L25 27L25 26L26 26L26 27L27 27L27 26L28 26L28 25L27 25L27 26L26 26L26 24L25 24L25 23L28 23L28 22L29 22L29 21L28 21L28 22L27 22L27 20L26 20L26 19L27 19L27 18L28 18L28 19L29 19L29 17L32 17L32 16L33 16L33 18L34 18L34 19L33 19L33 20L34 20L34 19L35 19L35 20L36 20L36 19L39 19L39 17L40 17L40 20L37 20L37 21L36 21L36 23L39 23L39 21L40 21L40 23L41 23L41 21L40 21L40 20L41 20L41 17L40 17L40 15L39 15L39 14L41 14L41 13L39 13L39 12L40 12L40 11L41 11L41 8L37 8L37 9L38 9L38 10L36 10L36 8L35 8L35 9L33 9L33 6L32 6L32 7L31 7L31 6L30 6L30 5L33 5L33 4L31 4L31 3L33 3L33 0L31 0L31 1L29 1L29 0L27 0L27 1L26 1L26 0L25 0L25 1L23 1L23 0L22 0L22 1L20 1L20 0L19 0L19 3L18 3L18 1L17 1L17 0L11 0L11 1L13 1L13 2L14 2L14 3L15 3L15 4L16 4L16 5L15 5L15 6L14 6L14 4L13 4L13 3L12 3L12 4L11 4L11 5L10 5L10 4L9 4L9 3L11 3L11 2L9 2L9 1L10 1L10 0ZM16 1L16 3L17 3L17 1ZM25 1L25 2L26 2L26 1ZM27 1L27 3L28 3L28 4L26 4L26 3L25 3L25 4L26 4L26 5L25 5L25 8L24 8L24 6L23 6L23 8L20 8L20 9L17 9L17 7L18 7L18 8L19 8L19 7L20 7L20 5L24 5L24 4L23 4L23 3L24 3L24 2L22 2L22 4L20 4L20 3L19 3L19 5L18 5L18 4L17 4L17 5L16 5L16 6L15 6L15 7L14 7L14 6L13 6L13 5L12 5L12 6L11 6L11 8L13 8L13 9L12 9L12 10L11 10L11 9L10 9L10 10L11 10L11 11L10 11L10 15L9 15L9 16L8 16L8 15L6 15L6 14L7 14L7 13L6 13L6 12L7 12L7 11L6 11L6 10L7 10L7 9L4 9L4 11L3 11L3 10L2 10L2 9L1 9L1 10L2 10L2 11L3 11L3 12L2 12L2 13L1 13L1 15L2 15L2 16L3 16L3 17L4 17L4 18L5 18L5 19L4 19L4 21L5 21L5 22L7 22L7 21L9 21L9 23L4 23L4 24L3 24L3 25L2 25L2 24L1 24L1 25L2 25L2 27L1 27L1 28L4 28L4 30L7 30L7 29L6 29L6 28L7 28L7 27L8 27L8 28L10 28L10 29L11 29L11 30L12 30L12 29L13 29L13 28L11 28L11 27L8 27L8 26L10 26L10 25L9 25L9 23L10 23L10 24L12 24L12 23L13 23L13 24L14 24L14 25L13 25L13 26L15 26L15 24L17 24L17 25L16 25L16 27L14 27L14 29L15 29L15 30L16 30L16 31L18 31L18 28L17 28L17 29L16 29L16 27L19 27L19 23L20 23L20 21L17 21L17 19L19 19L19 18L21 18L21 19L20 19L20 20L21 20L21 24L20 24L20 27L22 27L22 26L25 26L25 25L24 25L24 23L25 23L25 22L24 22L24 21L25 21L25 19L26 19L26 18L27 18L27 17L29 17L29 16L31 16L31 15L32 15L32 14L34 14L34 12L35 12L35 11L34 11L34 10L32 10L32 9L29 9L29 11L27 11L27 13L26 13L26 10L28 10L28 8L29 8L29 7L30 7L30 8L31 8L31 7L30 7L30 6L29 6L29 5L30 5L30 3L31 3L31 2L30 2L30 3L29 3L29 2L28 2L28 1ZM28 4L28 5L27 5L27 6L26 6L26 8L25 8L25 10L26 10L26 8L27 8L27 6L28 6L28 7L29 7L29 6L28 6L28 5L29 5L29 4ZM17 5L17 6L16 6L16 7L17 7L17 6L18 6L18 7L19 7L19 6L18 6L18 5ZM9 6L9 7L10 7L10 6ZM12 6L12 7L13 7L13 6ZM21 6L21 7L22 7L22 6ZM14 8L14 10L12 10L12 11L13 11L13 13L12 13L12 12L11 12L11 13L12 13L12 14L11 14L11 15L10 15L10 16L9 16L9 17L10 17L10 19L11 19L11 20L12 20L12 21L13 21L13 22L14 22L14 23L15 23L15 22L14 22L14 21L15 21L15 20L16 20L16 19L17 19L17 17L18 17L18 18L19 18L19 17L20 17L20 16L21 16L21 15L20 15L20 14L21 14L21 13L22 13L22 14L23 14L23 15L22 15L22 16L23 16L23 15L24 15L24 18L23 18L23 17L22 17L22 19L25 19L25 18L26 18L26 17L27 17L27 14L26 14L26 13L25 13L25 15L24 15L24 13L22 13L22 11L21 11L21 9L20 9L20 11L18 11L18 12L19 12L19 14L18 14L18 15L16 15L16 14L15 14L15 13L14 13L14 11L15 11L15 12L16 12L16 13L17 13L17 12L16 12L16 10L17 10L17 9L16 9L16 8ZM22 9L22 10L23 10L23 11L24 11L24 12L25 12L25 11L24 11L24 10L23 10L23 9ZM39 9L39 11L38 11L38 12L39 12L39 11L40 11L40 9ZM30 10L30 11L29 11L29 12L30 12L30 13L31 13L31 14L30 14L30 15L31 15L31 14L32 14L32 13L33 13L33 12L34 12L34 11L32 11L32 10ZM5 11L5 12L6 12L6 11ZM30 11L30 12L31 12L31 11ZM36 11L36 12L37 12L37 11ZM20 12L20 13L21 13L21 12ZM3 13L3 14L2 14L2 15L4 15L4 14L6 14L6 13ZM36 13L36 14L35 14L35 15L34 15L34 16L35 16L35 19L36 19L36 18L38 18L38 13ZM13 14L13 15L12 15L12 16L11 16L11 17L13 17L13 15L14 15L14 14ZM28 14L28 15L29 15L29 14ZM36 14L36 15L35 15L35 16L36 16L36 15L37 15L37 14ZM5 15L5 18L6 18L6 19L5 19L5 21L7 21L7 20L9 20L9 18L8 18L8 17L7 17L7 16L6 16L6 15ZM25 15L25 17L26 17L26 15ZM15 16L15 18L11 18L11 19L13 19L13 20L14 20L14 19L15 19L15 18L16 18L16 17L17 17L17 16ZM6 17L6 18L7 18L7 17ZM30 18L30 19L31 19L31 21L30 21L30 23L29 23L29 24L30 24L30 27L28 27L28 29L30 29L30 27L31 27L31 30L30 30L30 31L31 31L31 34L30 34L30 35L31 35L31 37L33 37L33 38L35 38L35 37L36 37L36 38L37 38L37 39L36 39L36 40L35 40L35 39L34 39L34 41L37 41L37 40L38 40L38 41L40 41L40 40L38 40L38 39L41 39L41 38L40 38L40 37L39 37L39 36L38 36L38 35L39 35L39 34L40 34L40 35L41 35L41 34L40 34L40 33L41 33L41 32L40 32L40 31L41 31L41 30L40 30L40 31L39 31L39 29L40 29L40 28L41 28L41 27L39 27L39 26L41 26L41 25L40 25L40 24L39 24L39 25L38 25L38 27L39 27L39 28L38 28L38 30L37 30L37 28L35 28L35 29L33 29L33 28L34 28L34 27L37 27L37 26L34 26L34 27L33 27L33 25L34 25L34 24L33 24L33 23L32 23L32 22L31 22L31 21L32 21L32 18ZM6 19L6 20L7 20L7 19ZM22 20L22 22L23 22L23 20ZM16 21L16 23L17 23L17 24L18 24L18 23L19 23L19 22L18 22L18 23L17 23L17 21ZM33 21L33 22L34 22L34 23L35 23L35 22L34 22L34 21ZM37 21L37 22L38 22L38 21ZM2 22L2 23L3 23L3 22ZM22 23L22 25L23 25L23 23ZM4 24L4 26L6 26L6 27L7 27L7 26L8 26L8 24L6 24L6 25L5 25L5 24ZM36 24L36 25L37 25L37 24ZM6 25L6 26L7 26L7 25ZM11 25L11 26L12 26L12 25ZM31 26L31 27L32 27L32 26ZM4 27L4 28L5 28L5 27ZM8 30L8 31L9 31L9 30ZM28 30L28 31L29 31L29 30ZM31 30L31 31L32 31L32 30ZM33 30L33 31L34 31L34 32L37 32L37 34L38 34L38 33L40 33L40 32L39 32L39 31L34 31L34 30ZM6 31L6 32L7 32L7 31ZM23 31L23 33L21 33L21 32L20 32L20 33L19 33L19 34L18 34L18 36L19 36L19 34L20 34L20 35L22 35L22 34L24 34L24 35L23 35L23 37L21 37L21 39L23 39L23 37L24 37L24 36L26 36L26 35L25 35L25 33L26 33L26 31L25 31L25 32L24 32L24 31ZM0 32L0 33L2 33L2 32ZM29 32L29 33L30 33L30 32ZM33 33L33 36L36 36L36 33ZM31 34L31 35L32 35L32 34ZM34 34L34 35L35 35L35 34ZM8 35L8 37L9 37L9 39L8 39L8 41L13 41L13 39L12 39L12 40L11 40L11 38L10 38L10 36L9 36L9 35ZM29 36L29 37L30 37L30 36ZM37 36L37 38L38 38L38 36ZM16 37L16 39L17 39L17 37ZM26 37L26 39L27 39L27 37ZM30 38L30 39L29 39L29 40L31 40L31 41L32 41L32 40L33 40L33 39L32 39L32 38ZM9 39L9 40L10 40L10 39ZM0 0L0 7L7 7L7 0ZM1 1L1 6L6 6L6 1ZM2 2L2 5L5 5L5 2ZM34 0L34 7L41 7L41 0ZM35 1L35 6L40 6L40 1ZM36 2L36 5L39 5L39 2ZM0 34L0 41L7 41L7 34ZM1 35L1 40L6 40L6 35ZM2 36L2 39L5 39L5 36Z" fill="#000000"/></g></g></svg>\n	1	2025-07-05 11:59:21.053628+00	1	2025-07-05 11:59:21.053628+00	1	f
25	arsalan@gmail.com	arsalan@gmail.com	$2b$10$RBDfxDdzarWG80xcM3r5yOfDTkBa985HkADBowas3pC4v7Kfvzp/2	G7RB4YKXJFNSC26Y	<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="200" height="200" fill="#fefefe"/><g transform="scale(4.082)"><g transform="translate(4,4)"><path fill-rule="evenodd" d="M12 0L12 1L13 1L13 2L12 2L12 3L11 3L11 4L10 4L10 5L8 5L8 7L9 7L9 8L6 8L6 9L5 9L5 8L0 8L0 10L2 10L2 9L3 9L3 12L2 12L2 11L1 11L1 12L2 12L2 13L0 13L0 14L2 14L2 16L1 16L1 17L0 17L0 18L2 18L2 17L3 17L3 16L5 16L5 14L4 14L4 15L3 15L3 14L2 14L2 13L3 13L3 12L6 12L6 13L7 13L7 12L9 12L9 13L8 13L8 14L6 14L6 15L8 15L8 14L10 14L10 15L11 15L11 17L10 17L10 18L13 18L13 19L9 19L9 17L8 17L8 20L10 20L10 21L9 21L9 22L8 22L8 24L6 24L6 25L5 25L5 27L4 27L4 28L3 28L3 27L2 27L2 28L3 28L3 29L5 29L5 30L2 30L2 29L1 29L1 26L2 26L2 24L3 24L3 25L4 25L4 23L7 23L7 22L6 22L6 21L7 21L7 20L6 20L6 19L7 19L7 18L6 18L6 17L7 17L7 16L6 16L6 17L5 17L5 18L3 18L3 19L0 19L0 23L1 23L1 26L0 26L0 33L1 33L1 30L2 30L2 32L3 32L3 33L4 33L4 32L5 32L5 33L7 33L7 32L8 32L8 35L9 35L9 32L10 32L10 31L11 31L11 34L13 34L13 36L14 36L14 37L15 37L15 38L14 38L14 39L12 39L12 41L18 41L18 40L20 40L20 41L21 41L21 39L18 39L18 40L16 40L16 39L17 39L17 38L16 38L16 37L17 37L17 36L20 36L20 38L22 38L22 39L23 39L23 40L22 40L22 41L23 41L23 40L24 40L24 39L26 39L26 38L24 38L24 39L23 39L23 38L22 38L22 36L24 36L24 37L27 37L27 38L28 38L28 37L30 37L30 38L29 38L29 39L28 39L28 40L26 40L26 41L28 41L28 40L29 40L29 39L30 39L30 38L31 38L31 39L32 39L32 38L33 38L33 37L34 37L34 39L35 39L35 40L34 40L34 41L38 41L38 39L40 39L40 40L41 40L41 39L40 39L40 38L38 38L38 35L39 35L39 34L41 34L41 31L39 31L39 30L40 30L40 29L39 29L39 30L38 30L38 28L37 28L37 27L33 27L33 26L34 26L34 25L33 25L33 26L32 26L32 27L30 27L30 26L31 26L31 24L33 24L33 21L34 21L34 22L35 22L35 23L34 23L34 24L35 24L35 23L36 23L36 25L37 25L37 26L38 26L38 27L41 27L41 26L38 26L38 25L39 25L39 24L37 24L37 23L39 23L39 22L38 22L38 21L37 21L37 19L39 19L39 21L40 21L40 20L41 20L41 19L39 19L39 18L41 18L41 17L39 17L39 16L41 16L41 13L40 13L40 15L39 15L39 14L38 14L38 13L37 13L37 15L34 15L34 14L31 14L31 13L30 13L30 14L29 14L29 12L33 12L33 13L34 13L34 12L35 12L35 11L32 11L32 9L31 9L31 8L32 8L32 7L33 7L33 6L32 6L32 7L31 7L31 6L30 6L30 5L29 5L29 2L30 2L30 4L31 4L31 5L33 5L33 4L31 4L31 3L33 3L33 2L30 2L30 1L27 1L27 0L26 0L26 3L24 3L24 2L25 2L25 0L24 0L24 2L23 2L23 0L21 0L21 1L22 1L22 2L19 2L19 1L20 1L20 0L19 0L19 1L16 1L16 0ZM8 1L8 2L10 2L10 1ZM15 1L15 2L14 2L14 3L13 3L13 4L11 4L11 5L13 5L13 7L12 7L12 6L11 6L11 7L10 7L10 6L9 6L9 7L10 7L10 8L9 8L9 9L8 9L8 10L7 10L7 9L6 9L6 10L7 10L7 11L6 11L6 12L7 12L7 11L8 11L8 10L9 10L9 9L10 9L10 11L13 11L13 13L11 13L11 12L10 12L10 14L13 14L13 15L12 15L12 16L13 16L13 17L14 17L14 18L16 18L16 19L17 19L17 21L16 21L16 22L18 22L18 23L16 23L16 25L15 25L15 23L14 23L14 22L15 22L15 21L14 21L14 20L15 20L15 19L14 19L14 20L11 20L11 23L10 23L10 22L9 22L9 23L10 23L10 24L9 24L9 25L8 25L8 26L7 26L7 25L6 25L6 26L7 26L7 27L6 27L6 28L5 28L5 29L6 29L6 30L5 30L5 32L7 32L7 31L10 31L10 29L9 29L9 28L10 28L10 27L11 27L11 30L13 30L13 31L12 31L12 33L13 33L13 32L15 32L15 33L14 33L14 34L16 34L16 31L17 31L17 30L18 30L18 25L20 25L20 24L19 24L19 22L20 22L20 23L21 23L21 25L22 25L22 26L21 26L21 27L20 27L20 28L19 28L19 29L20 29L20 30L19 30L19 31L18 31L18 32L17 32L17 33L18 33L18 35L19 35L19 34L20 34L20 35L22 35L22 34L20 34L20 32L19 32L19 31L20 31L20 30L21 30L21 31L22 31L22 32L21 32L21 33L23 33L23 35L25 35L25 36L28 36L28 34L30 34L30 35L29 35L29 36L31 36L31 37L32 37L32 36L31 36L31 35L32 35L32 32L30 32L30 33L29 33L29 32L28 32L28 31L26 31L26 32L28 32L28 34L27 34L27 33L24 33L24 32L25 32L25 31L24 31L24 32L23 32L23 31L22 31L22 30L24 30L24 29L25 29L25 30L26 30L26 29L27 29L27 28L28 28L28 29L29 29L29 30L30 30L30 31L31 31L31 29L32 29L32 28L30 28L30 29L29 29L29 27L28 27L28 26L30 26L30 24L31 24L31 23L32 23L32 21L33 21L33 19L35 19L35 20L34 20L34 21L35 21L35 20L36 20L36 19L37 19L37 16L39 16L39 15L37 15L37 16L35 16L35 18L34 18L34 16L33 16L33 18L32 18L32 20L30 20L30 19L31 19L31 17L32 17L32 16L31 16L31 17L28 17L28 19L26 19L26 18L27 18L27 17L26 17L26 16L28 16L28 15L29 15L29 14L27 14L27 12L28 12L28 11L26 11L26 9L27 9L27 10L30 10L30 11L31 11L31 9L29 9L29 8L30 8L30 6L29 6L29 7L28 7L28 5L27 5L27 7L26 7L26 6L25 6L25 5L26 5L26 4L27 4L27 3L28 3L28 2L27 2L27 3L26 3L26 4L24 4L24 3L19 3L19 2L18 2L18 3L17 3L17 4L16 4L16 5L18 5L18 6L17 6L17 7L16 7L16 6L15 6L15 7L14 7L14 5L15 5L15 4L14 4L14 3L15 3L15 2L16 2L16 1ZM8 3L8 4L9 4L9 3ZM20 4L20 5L22 5L22 7L23 7L23 8L24 8L24 7L25 7L25 6L24 6L24 7L23 7L23 4ZM18 6L18 7L19 7L19 8L17 8L17 9L16 9L16 7L15 7L15 9L14 9L14 7L13 7L13 8L11 8L11 10L12 10L12 9L14 9L14 10L15 10L15 11L14 11L14 12L15 12L15 13L14 13L14 15L13 15L13 16L15 16L15 14L17 14L17 15L16 15L16 16L17 16L17 15L18 15L18 16L20 16L20 17L19 17L19 18L17 18L17 19L19 19L19 20L18 20L18 22L19 22L19 20L20 20L20 21L21 21L21 22L22 22L22 21L23 21L23 22L24 22L24 23L23 23L23 24L22 24L22 25L23 25L23 24L24 24L24 26L25 26L25 27L23 27L23 28L22 28L22 27L21 27L21 28L22 28L22 29L21 29L21 30L22 30L22 29L23 29L23 28L25 28L25 27L26 27L26 28L27 28L27 27L26 27L26 26L27 26L27 25L28 25L28 24L29 24L29 23L30 23L30 22L29 22L29 23L28 23L28 24L27 24L27 25L26 25L26 26L25 26L25 24L24 24L24 23L27 23L27 22L28 22L28 20L29 20L29 21L30 21L30 20L29 20L29 19L30 19L30 18L29 18L29 19L28 19L28 20L27 20L27 21L26 21L26 22L24 22L24 21L23 21L23 20L24 20L24 19L25 19L25 18L24 18L24 17L23 17L23 16L24 16L24 15L25 15L25 16L26 16L26 15L27 15L27 14L25 14L25 13L24 13L24 14L23 14L23 12L24 12L24 11L25 11L25 12L26 12L26 11L25 11L25 10L23 10L23 9L22 9L22 8L21 8L21 6L20 6L20 7L19 7L19 6ZM19 8L19 11L15 11L15 12L16 12L16 13L17 13L17 14L18 14L18 15L19 15L19 13L20 13L20 12L19 12L19 11L21 11L21 12L22 12L22 11L23 11L23 10L20 10L20 8ZM27 8L27 9L28 9L28 8ZM33 8L33 9L34 9L34 10L36 10L36 8L35 8L35 9L34 9L34 8ZM37 8L37 11L36 11L36 12L38 12L38 11L39 11L39 12L41 12L41 10L38 10L38 8ZM39 8L39 9L40 9L40 8ZM4 9L4 10L5 10L5 9ZM17 9L17 10L18 10L18 9ZM17 12L17 13L19 13L19 12ZM20 14L20 15L21 15L21 16L23 16L23 15L22 15L22 14ZM30 14L30 15L31 15L31 14ZM20 17L20 18L19 18L19 19L20 19L20 18L21 18L21 19L24 19L24 18L23 18L23 17L22 17L22 18L21 18L21 17ZM38 17L38 18L39 18L39 17ZM35 18L35 19L36 19L36 18ZM3 19L3 20L1 20L1 22L2 22L2 21L3 21L3 23L4 23L4 22L5 22L5 21L6 21L6 20L5 20L5 21L3 21L3 20L4 20L4 19ZM21 20L21 21L22 21L22 20ZM12 21L12 22L13 22L13 21ZM36 21L36 23L37 23L37 21ZM12 23L12 24L13 24L13 25L10 25L10 26L9 26L9 27L10 27L10 26L12 26L12 27L13 27L13 25L14 25L14 23ZM40 23L40 24L41 24L41 23ZM15 26L15 27L14 27L14 28L15 28L15 29L14 29L14 31L15 31L15 30L17 30L17 29L16 29L16 28L17 28L17 26ZM7 27L7 28L6 28L6 29L7 29L7 30L6 30L6 31L7 31L7 30L8 30L8 29L7 29L7 28L8 28L8 27ZM12 28L12 29L13 29L13 28ZM35 28L35 30L34 30L34 29L33 29L33 30L32 30L32 31L35 31L35 30L36 30L36 31L37 31L37 30L36 30L36 29L37 29L37 28ZM3 31L3 32L4 32L4 31ZM38 31L38 34L39 34L39 31ZM33 33L33 36L36 36L36 33ZM25 34L25 35L26 35L26 34ZM34 34L34 35L35 35L35 34ZM14 35L14 36L17 36L17 35ZM40 35L40 36L39 36L39 37L40 37L40 36L41 36L41 35ZM8 36L8 41L11 41L11 40L10 40L10 39L11 39L11 37L9 37L9 36ZM12 37L12 38L13 38L13 37ZM18 37L18 38L19 38L19 37ZM35 37L35 38L36 38L36 37ZM9 38L9 39L10 39L10 38ZM37 38L37 39L36 39L36 40L37 40L37 39L38 39L38 38ZM14 39L14 40L15 40L15 39ZM0 0L0 7L7 7L7 0ZM1 1L1 6L6 6L6 1ZM2 2L2 5L5 5L5 2ZM34 0L34 7L41 7L41 0ZM35 1L35 6L40 6L40 1ZM36 2L36 5L39 5L39 2ZM0 34L0 41L7 41L7 34ZM1 35L1 40L6 40L6 35ZM2 36L2 39L5 39L5 36Z" fill="#000000"/></g></g></svg>\n	1	2025-07-09 15:11:12.839679+00	1	2025-07-09 15:11:12.839679+00	1	f
26	arsalan@gmail.com	arsalan@gmail.com	$2b$10$Pq1QqUan2m8lzz.nnHF1o.BYGJdE5VTo6A1E1NDkbOFSFEwJxM1Im	OJYJGS5OBQDZ77FA	<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="200" height="200" fill="#fefefe"/><g transform="scale(4.082)"><g transform="translate(4,4)"><path fill-rule="evenodd" d="M8 0L8 1L11 1L11 2L8 2L8 5L11 5L11 4L13 4L13 2L14 2L14 1L15 1L15 0L13 0L13 1L11 1L11 0ZM19 0L19 1L20 1L20 3L21 3L21 2L23 2L23 3L24 3L24 4L22 4L22 5L21 5L21 6L20 6L20 5L19 5L19 4L17 4L17 3L19 3L19 2L17 2L17 1L16 1L16 2L17 2L17 3L14 3L14 5L15 5L15 4L17 4L17 6L16 6L16 7L17 7L17 9L16 9L16 10L17 10L17 9L18 9L18 10L19 10L19 9L20 9L20 13L19 13L19 11L18 11L18 12L17 12L17 13L16 13L16 12L15 12L15 8L12 8L12 7L13 7L13 6L12 6L12 7L11 7L11 6L10 6L10 7L9 7L9 6L8 6L8 7L9 7L9 8L8 8L8 9L7 9L7 8L6 8L6 9L7 9L7 10L6 10L6 11L8 11L8 12L6 12L6 13L8 13L8 14L6 14L6 15L5 15L5 13L4 13L4 10L5 10L5 9L4 9L4 8L0 8L0 11L2 11L2 12L1 12L1 13L0 13L0 15L1 15L1 13L2 13L2 14L3 14L3 15L2 15L2 16L1 16L1 17L2 17L2 19L1 19L1 18L0 18L0 19L1 19L1 20L0 20L0 22L1 22L1 20L2 20L2 19L3 19L3 16L6 16L6 17L5 17L5 18L4 18L4 19L5 19L5 18L6 18L6 19L7 19L7 20L6 20L6 21L4 21L4 20L3 20L3 21L2 21L2 22L3 22L3 21L4 21L4 23L0 23L0 24L1 24L1 27L0 27L0 28L1 28L1 29L2 29L2 30L3 30L3 31L4 31L4 32L6 32L6 33L8 33L8 34L9 34L9 35L10 35L10 36L11 36L11 34L12 34L12 36L13 36L13 35L14 35L14 34L15 34L15 35L16 35L16 34L15 34L15 33L17 33L17 34L18 34L18 35L17 35L17 36L14 36L14 38L12 38L12 37L11 37L11 38L12 38L12 40L11 40L11 39L10 39L10 37L8 37L8 41L9 41L9 40L10 40L10 41L12 41L12 40L13 40L13 39L15 39L15 40L16 40L16 41L17 41L17 40L18 40L18 41L19 41L19 40L21 40L21 41L25 41L25 40L24 40L24 39L23 39L23 40L21 40L21 39L22 39L22 38L21 38L21 39L20 39L20 38L18 38L18 37L17 37L17 36L18 36L18 35L20 35L20 37L22 37L22 36L21 36L21 35L23 35L23 36L24 36L24 37L23 37L23 38L25 38L25 37L26 37L26 38L27 38L27 39L28 39L28 40L29 40L29 41L31 41L31 40L29 40L29 39L31 39L31 38L32 38L32 37L33 37L33 39L34 39L34 38L35 38L35 40L32 40L32 41L35 41L35 40L36 40L36 37L37 37L37 41L40 41L40 40L41 40L41 38L40 38L40 37L38 37L38 36L37 36L37 35L38 35L38 33L37 33L37 32L39 32L39 30L37 30L37 32L35 32L35 31L36 31L36 30L35 30L35 31L34 31L34 32L32 32L32 30L34 30L34 29L40 29L40 30L41 30L41 29L40 29L40 27L41 27L41 26L40 26L40 25L39 25L39 24L40 24L40 22L39 22L39 24L38 24L38 20L39 20L39 18L37 18L37 17L38 17L38 16L37 16L37 14L38 14L38 15L39 15L39 17L40 17L40 16L41 16L41 15L40 15L40 14L41 14L41 13L35 13L35 14L34 14L34 12L33 12L33 11L34 11L34 10L35 10L35 11L38 11L38 9L39 9L39 8L36 8L36 9L34 9L34 8L33 8L33 6L32 6L32 4L31 4L31 3L30 3L30 4L29 4L29 3L28 3L28 2L29 2L29 1L28 1L28 2L24 2L24 1L25 1L25 0L24 0L24 1L23 1L23 0L21 0L21 1L20 1L20 0ZM26 0L26 1L27 1L27 0ZM30 1L30 2L31 2L31 1ZM32 1L32 3L33 3L33 1ZM11 2L11 3L10 3L10 4L11 4L11 3L12 3L12 2ZM26 3L26 4L25 4L25 8L26 8L26 9L24 9L24 5L22 5L22 6L21 6L21 7L20 7L20 6L19 6L19 7L20 7L20 8L21 8L21 9L22 9L22 8L23 8L23 10L22 10L22 12L23 12L23 13L24 13L24 16L25 16L25 17L26 17L26 18L25 18L25 20L26 20L26 21L24 21L24 18L22 18L22 16L23 16L23 14L22 14L22 13L20 13L20 14L19 14L19 15L21 15L21 16L19 16L19 19L20 19L20 20L22 20L22 23L23 23L23 21L24 21L24 23L25 23L25 22L26 22L26 24L25 24L25 25L24 25L24 24L23 24L23 25L22 25L22 24L21 24L21 25L20 25L20 23L19 23L19 24L18 24L18 21L19 21L19 22L21 22L21 21L19 21L19 20L16 20L16 19L17 19L17 18L18 18L18 17L17 17L17 16L18 16L18 15L17 15L17 16L16 16L16 15L14 15L14 17L13 17L13 18L11 18L11 17L12 17L12 16L13 16L13 14L16 14L16 13L15 13L15 12L13 12L13 14L12 14L12 16L11 16L11 14L10 14L10 12L11 12L11 13L12 13L12 11L14 11L14 9L13 9L13 10L12 10L12 11L11 11L11 9L12 9L12 8L11 8L11 7L10 7L10 8L11 8L11 9L9 9L9 10L8 10L8 11L9 11L9 15L6 15L6 16L7 16L7 17L6 17L6 18L7 18L7 19L8 19L8 22L7 22L7 21L6 21L6 22L5 22L5 25L2 25L2 26L4 26L4 29L3 29L3 30L4 30L4 29L5 29L5 31L6 31L6 32L9 32L9 34L10 34L10 33L11 33L11 32L12 32L12 33L13 33L13 32L14 32L14 33L15 33L15 31L17 31L17 33L18 33L18 34L20 34L20 33L18 33L18 31L17 31L17 30L19 30L19 31L20 31L20 32L23 32L23 34L27 34L27 33L28 33L28 34L29 34L29 35L28 35L28 36L30 36L30 34L31 34L31 37L30 37L30 38L31 38L31 37L32 37L32 33L28 33L28 32L27 32L27 33L26 33L26 32L24 32L24 31L22 31L22 29L20 29L20 28L21 28L21 27L20 27L20 26L23 26L23 27L22 27L22 28L23 28L23 27L24 27L24 26L25 26L25 29L23 29L23 30L25 30L25 29L26 29L26 27L27 27L27 30L30 30L30 31L29 31L29 32L31 32L31 30L32 30L32 29L34 29L34 28L31 28L31 30L30 30L30 28L29 28L29 25L30 25L30 26L32 26L32 25L33 25L33 26L35 26L35 27L36 27L36 26L35 26L35 25L36 25L36 24L37 24L37 23L36 23L36 22L37 22L37 20L38 20L38 19L37 19L37 18L36 18L36 17L34 17L34 18L32 18L32 17L33 17L33 16L29 16L29 18L28 18L28 15L26 15L26 13L27 13L27 14L28 14L28 13L27 13L27 11L28 11L28 12L29 12L29 13L30 13L30 14L31 14L31 15L32 15L32 13L33 13L33 12L32 12L32 11L30 11L30 10L31 10L31 7L32 7L32 6L31 6L31 7L30 7L30 6L29 6L29 5L28 5L28 4L27 4L27 3ZM26 5L26 8L28 8L28 9L30 9L30 7L29 7L29 6L28 6L28 5ZM14 6L14 7L15 7L15 6ZM17 6L17 7L18 7L18 6ZM22 6L22 7L21 7L21 8L22 8L22 7L23 7L23 6ZM27 6L27 7L28 7L28 8L29 8L29 7L28 7L28 6ZM18 8L18 9L19 9L19 8ZM32 8L32 10L34 10L34 9L33 9L33 8ZM40 8L40 9L41 9L41 8ZM26 9L26 10L27 10L27 9ZM36 9L36 10L37 10L37 9ZM28 10L28 11L29 11L29 12L30 12L30 11L29 11L29 10ZM40 10L40 11L41 11L41 10ZM23 11L23 12L25 12L25 11ZM3 13L3 14L4 14L4 13ZM21 14L21 15L22 15L22 14ZM33 14L33 15L34 15L34 14ZM35 14L35 15L36 15L36 14ZM25 15L25 16L26 16L26 15ZM9 16L9 17L7 17L7 18L8 18L8 19L11 19L11 18L9 18L9 17L11 17L11 16ZM15 16L15 17L14 17L14 18L13 18L13 20L12 20L12 22L11 22L11 21L10 21L10 20L9 20L9 22L8 22L8 24L6 24L6 25L7 25L7 26L5 26L5 28L6 28L6 29L7 29L7 28L8 28L8 30L6 30L6 31L9 31L9 32L11 32L11 31L12 31L12 32L13 32L13 30L14 30L14 31L15 31L15 28L17 28L17 29L18 29L18 28L20 28L20 27L18 27L18 28L17 28L17 27L16 27L16 26L15 26L15 25L17 25L17 26L18 26L18 25L17 25L17 22L16 22L16 21L15 21L15 18L17 18L17 17L16 17L16 16ZM30 17L30 18L29 18L29 19L28 19L28 18L26 18L26 20L28 20L28 21L26 21L26 22L27 22L27 27L28 27L28 21L32 21L32 22L33 22L33 23L32 23L32 24L34 24L34 22L36 22L36 18L35 18L35 19L34 19L34 22L33 22L33 21L32 21L32 20L33 20L33 19L32 19L32 18L31 18L31 17ZM20 18L20 19L21 19L21 18ZM30 18L30 20L31 20L31 18ZM22 19L22 20L23 20L23 19ZM40 19L40 21L41 21L41 19ZM13 21L13 23L11 23L11 25L10 25L10 24L9 24L9 25L10 25L10 26L11 26L11 27L9 27L9 28L11 28L11 27L12 27L12 25L13 25L13 26L14 26L14 27L13 27L13 28L12 28L12 29L11 29L11 30L12 30L12 29L14 29L14 27L15 27L15 26L14 26L14 25L15 25L15 24L16 24L16 22L15 22L15 21ZM6 22L6 23L7 23L7 22ZM30 22L30 25L31 25L31 22ZM13 23L13 25L14 25L14 23ZM19 25L19 26L20 26L20 25ZM23 25L23 26L24 26L24 25ZM7 26L7 27L6 27L6 28L7 28L7 27L8 27L8 26ZM39 26L39 27L37 27L37 28L39 28L39 27L40 27L40 26ZM0 30L0 31L1 31L1 30ZM20 30L20 31L21 31L21 30ZM40 31L40 32L41 32L41 31ZM1 32L1 33L3 33L3 32ZM33 33L33 36L36 36L36 33ZM39 33L39 35L40 35L40 36L41 36L41 35L40 35L40 34L41 34L41 33ZM34 34L34 35L35 35L35 34ZM24 35L24 36L25 36L25 35ZM26 35L26 36L27 36L27 35ZM15 37L15 39L16 39L16 40L17 40L17 39L18 39L18 38L17 38L17 37ZM27 37L27 38L29 38L29 37ZM39 38L39 39L38 39L38 40L40 40L40 38ZM0 0L0 7L7 7L7 0ZM1 1L1 6L6 6L6 1ZM2 2L2 5L5 5L5 2ZM34 0L34 7L41 7L41 0ZM35 1L35 6L40 6L40 1ZM36 2L36 5L39 5L39 2ZM0 34L0 41L7 41L7 34ZM1 35L1 40L6 40L6 35ZM2 36L2 39L5 39L5 36Z" fill="#000000"/></g></g></svg>\n	1	2025-07-09 15:12:12.385975+00	1	2025-07-09 15:12:12.385975+00	1	f
27	aaa@gmail.com	aaa@gmail.com	$2b$10$ijLgge0YGyE4vmOUnKqnA.vlN6WAajqzakbQaPqfa/jNWo9tOmLV.	Y7OBUGHQBOAPR7QB	<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="200" height="200" fill="#fefefe"/><g transform="scale(4.082)"><g transform="translate(4,4)"><path fill-rule="evenodd" d="M8 0L8 1L9 1L9 0ZM11 0L11 1L10 1L10 2L11 2L11 3L12 3L12 10L11 10L11 11L10 11L10 13L7 13L7 12L8 12L8 9L9 9L9 8L8 8L8 9L7 9L7 8L6 8L6 9L5 9L5 10L4 10L4 8L0 8L0 10L1 10L1 9L3 9L3 10L4 10L4 11L5 11L5 13L7 13L7 14L3 14L3 15L2 15L2 13L3 13L3 12L0 12L0 13L1 13L1 14L0 14L0 15L1 15L1 16L3 16L3 15L4 15L4 16L5 16L5 17L3 17L3 18L5 18L5 17L10 17L10 18L6 18L6 19L4 19L4 21L3 21L3 20L1 20L1 21L3 21L3 22L2 22L2 23L0 23L0 24L2 24L2 25L5 25L5 24L6 24L6 25L7 25L7 26L3 26L3 27L2 27L2 26L1 26L1 25L0 25L0 28L1 28L1 27L2 27L2 31L5 31L5 32L3 32L3 33L8 33L8 34L9 34L9 35L10 35L10 36L11 36L11 35L12 35L12 36L13 36L13 35L14 35L14 34L15 34L15 33L16 33L16 34L18 34L18 35L17 35L17 36L14 36L14 38L12 38L12 37L11 37L11 38L12 38L12 40L11 40L11 39L9 39L9 37L8 37L8 41L13 41L13 39L14 39L14 41L15 41L15 40L16 40L16 41L19 41L19 40L22 40L22 41L25 41L25 40L26 40L26 39L28 39L28 38L29 38L29 39L31 39L31 38L32 38L32 37L33 37L33 39L32 39L32 40L29 40L29 41L33 41L33 40L34 40L34 41L35 41L35 40L36 40L36 37L37 37L37 39L39 39L39 38L40 38L40 40L37 40L37 41L40 41L40 40L41 40L41 38L40 38L40 37L38 37L38 36L37 36L37 35L38 35L38 33L39 33L39 32L35 32L35 31L34 31L34 32L32 32L32 31L31 31L31 32L29 32L29 31L30 31L30 30L29 30L29 29L30 29L30 28L33 28L33 27L34 27L34 30L35 30L35 28L36 28L36 29L40 29L40 30L41 30L41 29L40 29L40 28L41 28L41 25L38 25L38 24L40 24L40 23L38 23L38 22L35 22L35 24L36 24L36 25L35 25L35 26L33 26L33 25L32 25L32 26L30 26L30 25L31 25L31 23L32 23L32 24L34 24L34 21L38 21L38 20L39 20L39 21L41 21L41 19L39 19L39 18L41 18L41 17L40 17L40 16L41 16L41 15L40 15L40 14L41 14L41 13L37 13L37 12L36 12L36 13L35 13L35 12L34 12L34 13L33 13L33 11L34 11L34 10L35 10L35 11L38 11L38 9L39 9L39 8L36 8L36 9L34 9L34 8L33 8L33 9L34 9L34 10L32 10L32 7L33 7L33 6L32 6L32 7L31 7L31 5L32 5L32 4L33 4L33 1L32 1L32 4L31 4L31 1L30 1L30 3L28 3L28 2L27 2L27 1L28 1L28 0L26 0L26 1L25 1L25 0L20 0L20 1L18 1L18 0L16 0L16 1L15 1L15 0ZM14 1L14 2L13 2L13 5L14 5L14 3L17 3L17 4L15 4L15 8L14 8L14 6L13 6L13 8L14 8L14 9L13 9L13 11L11 11L11 12L13 12L13 14L12 14L12 16L11 16L11 18L16 18L16 17L14 17L14 15L13 15L13 14L16 14L16 13L18 13L18 11L19 11L19 14L18 14L18 15L17 15L17 17L18 17L18 16L19 16L19 17L21 17L21 18L18 18L18 19L17 19L17 20L16 20L16 19L15 19L15 21L13 21L13 23L10 23L10 22L12 22L12 19L11 19L11 21L10 21L10 19L9 19L9 20L8 20L8 21L6 21L6 20L7 20L7 19L6 19L6 20L5 20L5 21L4 21L4 23L3 23L3 24L5 24L5 21L6 21L6 22L7 22L7 23L6 23L6 24L7 24L7 23L8 23L8 21L9 21L9 23L10 23L10 24L9 24L9 26L10 26L10 27L8 27L8 26L7 26L7 27L6 27L6 28L4 28L4 27L3 27L3 29L5 29L5 31L6 31L6 32L7 32L7 31L8 31L8 30L7 30L7 29L6 29L6 28L7 28L7 27L8 27L8 28L9 28L9 30L10 30L10 31L11 31L11 32L12 32L12 33L14 33L14 32L15 32L15 31L18 31L18 33L19 33L19 30L18 30L18 29L21 29L21 32L22 32L22 30L23 30L23 34L24 34L24 35L25 35L25 39L24 39L24 38L22 38L22 36L20 36L20 34L21 34L21 33L20 33L20 34L19 34L19 35L18 35L18 36L17 36L17 37L15 37L15 39L16 39L16 40L19 40L19 39L18 39L18 38L20 38L20 39L21 39L21 38L22 38L22 40L23 40L23 39L24 39L24 40L25 40L25 39L26 39L26 38L28 38L28 37L27 37L27 34L26 34L26 31L25 31L25 29L24 29L24 30L23 30L23 26L22 26L22 24L23 24L23 25L24 25L24 28L26 28L26 29L28 29L28 28L29 28L29 25L30 25L30 20L29 20L29 21L28 21L28 20L26 20L26 21L24 21L24 19L23 19L23 21L22 21L22 24L21 24L21 21L20 21L20 22L19 22L19 23L18 23L18 25L21 25L21 26L22 26L22 27L21 27L21 28L19 28L19 26L17 26L17 24L16 24L16 22L18 22L18 20L19 20L19 19L20 19L20 20L22 20L22 18L24 18L24 17L26 17L26 18L28 18L28 19L29 19L29 18L30 18L30 19L31 19L31 18L32 18L32 19L35 19L35 18L36 18L36 20L38 20L38 19L37 19L37 18L39 18L39 15L38 15L38 14L37 14L37 13L36 13L36 14L37 14L37 18L36 18L36 17L34 17L34 18L32 18L32 17L33 17L33 16L29 16L29 18L28 18L28 16L26 16L26 15L28 15L28 14L29 14L29 13L30 13L30 12L31 12L31 13L32 13L32 15L34 15L34 14L33 14L33 13L32 13L32 11L30 11L30 10L31 10L31 7L30 7L30 6L29 6L29 4L27 4L27 5L26 5L26 4L25 4L25 5L24 5L24 3L23 3L23 2L21 2L21 1L20 1L20 2L18 2L18 1L16 1L16 2L15 2L15 1ZM24 1L24 2L25 2L25 1ZM8 2L8 5L9 5L9 6L8 6L8 7L9 7L9 6L10 6L10 8L11 8L11 6L10 6L10 5L9 5L9 4L10 4L10 3L9 3L9 2ZM17 2L17 3L18 3L18 2ZM26 2L26 3L27 3L27 2ZM21 3L21 4L20 4L20 5L18 5L18 4L17 4L17 5L18 5L18 8L19 8L19 9L20 9L20 10L21 10L21 11L20 11L20 12L21 12L21 13L20 13L20 14L19 14L19 16L20 16L20 15L22 15L22 14L23 14L23 12L24 12L24 15L23 15L23 16L22 16L22 17L24 17L24 16L25 16L25 12L26 12L26 14L27 14L27 13L29 13L29 12L30 12L30 11L29 11L29 12L28 12L28 11L27 11L27 12L26 12L26 10L28 10L28 9L27 9L27 8L28 8L28 7L29 7L29 9L30 9L30 7L29 7L29 6L28 6L28 7L27 7L27 6L26 6L26 8L25 8L25 9L26 9L26 10L25 10L25 12L24 12L24 11L23 11L23 10L24 10L24 9L22 9L22 7L23 7L23 6L22 6L22 5L21 5L21 4L22 4L22 3ZM30 4L30 5L31 5L31 4ZM20 5L20 6L19 6L19 8L20 8L20 9L21 9L21 8L20 8L20 6L21 6L21 7L22 7L22 6L21 6L21 5ZM16 6L16 7L17 7L17 6ZM24 6L24 7L25 7L25 6ZM16 8L16 9L17 9L17 8ZM40 8L40 9L41 9L41 8ZM6 9L6 10L5 10L5 11L6 11L6 12L7 12L7 11L6 11L6 10L7 10L7 9ZM14 9L14 11L13 11L13 12L15 12L15 13L16 13L16 12L15 12L15 9ZM36 9L36 10L37 10L37 9ZM17 10L17 11L18 11L18 10ZM39 10L39 11L40 11L40 10ZM21 11L21 12L22 12L22 11ZM10 13L10 14L9 14L9 15L8 15L8 14L7 14L7 15L6 15L6 16L7 16L7 15L8 15L8 16L10 16L10 15L11 15L11 13ZM21 13L21 14L22 14L22 13ZM15 15L15 16L16 16L16 15ZM12 16L12 17L13 17L13 16ZM0 17L0 18L1 18L1 19L2 19L2 18L1 18L1 17ZM30 17L30 18L31 18L31 17ZM32 20L32 21L31 21L31 22L32 22L32 21L33 21L33 20ZM15 21L15 22L16 22L16 21ZM26 21L26 22L24 22L24 23L23 23L23 24L24 24L24 23L25 23L25 24L27 24L27 25L26 25L26 27L28 27L28 24L27 24L27 23L28 23L28 21ZM13 23L13 24L12 24L12 26L13 26L13 27L10 27L10 30L11 30L11 31L12 31L12 32L13 32L13 31L14 31L14 30L15 30L15 28L17 28L17 29L18 29L18 28L17 28L17 26L15 26L15 25L16 25L16 24L15 24L15 23ZM36 23L36 24L38 24L38 23ZM14 24L14 25L13 25L13 26L14 26L14 27L13 27L13 28L12 28L12 29L11 29L11 30L12 30L12 29L14 29L14 27L15 27L15 26L14 26L14 25L15 25L15 24ZM35 26L35 27L36 27L36 26ZM39 26L39 27L37 27L37 28L40 28L40 26ZM31 29L31 30L32 30L32 29ZM0 30L0 31L1 31L1 30ZM6 30L6 31L7 31L7 30ZM38 30L38 31L39 31L39 30ZM24 31L24 34L25 34L25 35L26 35L26 34L25 34L25 31ZM27 31L27 33L28 33L28 34L29 34L29 35L28 35L28 36L29 36L29 37L32 37L32 33L28 33L28 31ZM40 31L40 32L41 32L41 31ZM1 32L1 33L2 33L2 32ZM16 32L16 33L17 33L17 32ZM10 33L10 35L11 35L11 33ZM33 33L33 36L36 36L36 33ZM40 33L40 34L41 34L41 33ZM12 34L12 35L13 35L13 34ZM30 34L30 35L29 35L29 36L30 36L30 35L31 35L31 34ZM34 34L34 35L35 35L35 34ZM39 35L39 36L40 36L40 35ZM23 36L23 37L24 37L24 36ZM17 37L17 38L18 38L18 37ZM34 38L34 40L35 40L35 38ZM0 0L0 7L7 7L7 0ZM1 1L1 6L6 6L6 1ZM2 2L2 5L5 5L5 2ZM34 0L34 7L41 7L41 0ZM35 1L35 6L40 6L40 1ZM36 2L36 5L39 5L39 2ZM0 34L0 41L7 41L7 34ZM1 35L1 40L6 40L6 35ZM2 36L2 39L5 39L5 36Z" fill="#000000"/></g></g></svg>\n	1	2025-07-09 15:18:36.113158+00	1	2025-07-09 15:18:36.113158+00	1	f
28	abcd@gmail.com	abcd@gmail.com	$2b$10$pcH4HFIyCot6ZOOgMVWzyucv/1DTGDIMf1e9tgh0C4NenEbc3iOgK	IKHE3KYAHMYFF6EH	<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="200" height="200" fill="#fefefe"/><g transform="scale(4.082)"><g transform="translate(4,4)"><path fill-rule="evenodd" d="M9 0L9 1L8 1L8 2L9 2L9 3L8 3L8 4L10 4L10 7L9 7L9 5L8 5L8 7L9 7L9 8L6 8L6 9L5 9L5 8L0 8L0 9L2 9L2 10L1 10L1 12L2 12L2 14L1 14L1 13L0 13L0 14L1 14L1 16L3 16L3 17L4 17L4 18L3 18L3 19L2 19L2 21L1 21L1 20L0 20L0 21L1 21L1 23L2 23L2 22L3 22L3 25L2 25L2 24L0 24L0 26L1 26L1 25L2 25L2 26L4 26L4 27L3 27L3 28L1 28L1 27L0 27L0 28L1 28L1 29L0 29L0 33L1 33L1 29L2 29L2 30L3 30L3 31L2 31L2 33L8 33L8 35L11 35L11 33L10 33L10 32L11 32L11 30L10 30L10 28L9 28L9 27L13 27L13 28L14 28L14 29L15 29L15 30L14 30L14 31L15 31L15 32L13 32L13 31L12 31L12 32L13 32L13 33L17 33L17 32L18 32L18 35L19 35L19 36L18 36L18 37L19 37L19 39L18 39L18 40L20 40L20 41L21 41L21 40L24 40L24 39L27 39L27 38L29 38L29 39L28 39L28 40L25 40L25 41L28 41L28 40L29 40L29 39L30 39L30 38L31 38L31 39L32 39L32 38L33 38L33 37L34 37L34 39L35 39L35 40L34 40L34 41L37 41L37 40L36 40L36 39L37 39L37 38L38 38L38 41L39 41L39 39L40 39L40 40L41 40L41 39L40 39L40 38L38 38L38 35L39 35L39 36L41 36L41 34L38 34L38 32L39 32L39 33L41 33L41 31L39 31L39 30L40 30L40 29L39 29L39 30L37 30L37 29L38 29L38 28L37 28L37 27L34 27L34 28L35 28L35 29L36 29L36 30L37 30L37 31L33 31L33 32L32 32L32 31L30 31L30 30L34 30L34 29L30 29L30 30L29 30L29 28L27 28L27 29L26 29L26 30L25 30L25 31L26 31L26 32L27 32L27 34L23 34L23 32L24 32L24 31L22 31L22 33L21 33L21 31L17 31L17 30L16 30L16 29L17 29L17 28L24 28L24 29L25 29L25 28L26 28L26 27L27 27L27 26L25 26L25 25L24 25L24 27L23 27L23 24L24 24L24 23L23 23L23 22L25 22L25 23L26 23L26 25L28 25L28 24L29 24L29 23L30 23L30 22L27 22L27 23L26 23L26 22L25 22L25 21L23 21L23 20L24 20L24 19L28 19L28 20L26 20L26 21L29 21L29 20L30 20L30 21L31 21L31 20L32 20L32 21L33 21L33 20L34 20L34 22L35 22L35 21L36 21L36 22L37 22L37 23L34 23L34 24L36 24L36 25L37 25L37 26L38 26L38 27L40 27L40 28L41 28L41 27L40 27L40 26L41 26L41 25L40 25L40 26L38 26L38 25L39 25L39 24L38 24L38 25L37 25L37 23L40 23L40 24L41 24L41 23L40 23L40 22L41 22L41 21L39 21L39 22L38 22L38 21L36 21L36 20L37 20L37 19L40 19L40 20L41 20L41 19L40 19L40 18L41 18L41 17L40 17L40 18L38 18L38 15L39 15L39 16L41 16L41 13L40 13L40 15L39 15L39 14L38 14L38 13L37 13L37 14L38 14L38 15L34 15L34 12L35 12L35 13L36 13L36 12L38 12L38 11L39 11L39 10L38 10L38 8L37 8L37 11L36 11L36 12L35 12L35 11L34 11L34 12L33 12L33 11L32 11L32 9L31 9L31 8L33 8L33 9L34 9L34 10L36 10L36 8L35 8L35 9L34 9L34 8L33 8L33 6L32 6L32 7L31 7L31 6L30 6L30 5L29 5L29 6L28 6L28 4L30 4L30 3L32 3L32 4L31 4L31 5L33 5L33 2L30 2L30 1L29 1L29 2L28 2L28 1L27 1L27 0L26 0L26 1L24 1L24 0L23 0L23 3L22 3L22 2L21 2L21 1L22 1L22 0L20 0L20 2L19 2L19 0L18 0L18 5L17 5L17 4L16 4L16 3L17 3L17 2L14 2L14 3L15 3L15 4L14 4L14 7L13 7L13 6L12 6L12 5L13 5L13 4L11 4L11 3L13 3L13 0L11 0L11 3L10 3L10 2L9 2L9 1L10 1L10 0ZM15 0L15 1L16 1L16 0ZM26 1L26 2L25 2L25 4L24 4L24 3L23 3L23 4L22 4L22 3L19 3L19 7L18 7L18 6L17 6L17 5L15 5L15 7L14 7L14 8L13 8L13 7L12 7L12 6L11 6L11 7L12 7L12 10L11 10L11 9L10 9L10 8L9 8L9 9L8 9L8 10L7 10L7 9L6 9L6 10L4 10L4 9L3 9L3 10L4 10L4 11L3 11L3 12L4 12L4 11L5 11L5 12L8 12L8 14L7 14L7 13L5 13L5 14L4 14L4 13L3 13L3 14L2 14L2 15L4 15L4 17L6 17L6 18L5 18L5 19L6 19L6 20L7 20L7 19L6 19L6 18L7 18L7 17L6 17L6 16L7 16L7 15L8 15L8 16L10 16L10 15L11 15L11 17L8 17L8 20L10 20L10 19L9 19L9 18L11 18L11 19L12 19L12 18L13 18L13 21L12 21L12 20L11 20L11 21L9 21L9 22L8 22L8 23L6 23L6 22L7 22L7 21L6 21L6 22L5 22L5 20L4 20L4 19L3 19L3 20L4 20L4 22L5 22L5 23L4 23L4 26L5 26L5 27L4 27L4 28L3 28L3 30L4 30L4 29L5 29L5 31L3 31L3 32L7 32L7 31L6 31L6 30L7 30L7 29L8 29L8 33L9 33L9 34L10 34L10 33L9 33L9 31L10 31L10 30L9 30L9 28L7 28L7 27L8 27L8 26L7 26L7 25L9 25L9 24L10 24L10 25L11 25L11 26L12 26L12 25L11 25L11 24L10 24L10 23L11 23L11 22L13 22L13 23L12 23L12 24L15 24L15 25L14 25L14 26L15 26L15 27L14 27L14 28L15 28L15 27L17 27L17 25L16 25L16 23L19 23L19 22L20 22L20 20L19 20L19 19L20 19L20 18L21 18L21 19L22 19L22 20L23 20L23 19L22 19L22 18L21 18L21 17L22 17L22 16L23 16L23 18L24 18L24 17L25 17L25 18L26 18L26 16L27 16L27 15L29 15L29 14L30 14L30 15L31 15L31 14L32 14L32 15L33 15L33 14L32 14L32 13L33 13L33 12L31 12L31 9L29 9L29 8L30 8L30 6L29 6L29 8L28 8L28 9L26 9L26 8L27 8L27 7L28 7L28 6L27 6L27 7L26 7L26 6L25 6L25 5L26 5L26 4L27 4L27 3L28 3L28 2L27 2L27 1ZM26 2L26 3L27 3L27 2ZM21 4L21 5L20 5L20 7L19 7L19 8L20 8L20 10L22 10L22 11L18 11L18 9L17 9L17 8L18 8L18 7L17 7L17 6L16 6L16 9L15 9L15 8L14 8L14 9L13 9L13 11L11 11L11 10L10 10L10 9L9 9L9 10L8 10L8 12L9 12L9 13L10 13L10 14L11 14L11 13L12 13L12 14L13 14L13 13L12 13L12 12L14 12L14 13L15 13L15 14L14 14L14 15L12 15L12 17L11 17L11 18L12 18L12 17L13 17L13 16L15 16L15 17L14 17L14 18L16 18L16 19L14 19L14 20L15 20L15 21L14 21L14 23L15 23L15 22L17 22L17 21L16 21L16 20L17 20L17 18L16 18L16 17L17 17L17 16L18 16L18 17L19 17L19 18L18 18L18 19L19 19L19 18L20 18L20 17L19 17L19 16L20 16L20 15L21 15L21 14L22 14L22 15L23 15L23 16L25 16L25 15L26 15L26 14L25 14L25 15L24 15L24 14L22 14L22 12L24 12L24 11L26 11L26 10L23 10L23 9L21 9L21 8L22 8L22 7L23 7L23 8L24 8L24 9L25 9L25 6L24 6L24 7L23 7L23 5L24 5L24 4L23 4L23 5L22 5L22 4ZM21 5L21 7L20 7L20 8L21 8L21 7L22 7L22 5ZM39 8L39 9L40 9L40 8ZM16 9L16 11L17 11L17 9ZM6 10L6 11L7 11L7 10ZM9 10L9 11L10 11L10 13L11 13L11 11L10 11L10 10ZM27 10L27 11L28 11L28 12L25 12L25 13L27 13L27 14L28 14L28 12L29 12L29 13L30 13L30 14L31 14L31 12L29 12L29 11L30 11L30 10L29 10L29 11L28 11L28 10ZM14 11L14 12L15 12L15 11ZM40 11L40 12L41 12L41 11ZM17 12L17 13L16 13L16 14L17 14L17 15L16 15L16 16L17 16L17 15L20 15L20 14L21 14L21 13L20 13L20 12ZM18 13L18 14L20 14L20 13ZM5 14L5 16L6 16L6 15L7 15L7 14ZM31 16L31 17L28 17L28 19L29 19L29 18L30 18L30 19L31 19L31 17L32 17L32 16ZM33 16L33 18L32 18L32 20L33 20L33 19L35 19L35 20L36 20L36 19L37 19L37 16L35 16L35 18L34 18L34 16ZM0 17L0 19L1 19L1 18L2 18L2 17ZM35 18L35 19L36 19L36 18ZM18 20L18 21L19 21L19 20ZM21 22L21 23L20 23L20 24L19 24L19 25L18 25L18 27L22 27L22 26L21 26L21 25L20 25L20 24L23 24L23 23L22 23L22 22ZM31 23L31 24L30 24L30 26L28 26L28 27L30 27L30 26L31 26L31 24L33 24L33 23ZM5 24L5 26L6 26L6 27L7 27L7 26L6 26L6 25L7 25L7 24ZM19 25L19 26L20 26L20 25ZM33 25L33 26L32 26L32 27L31 27L31 28L33 28L33 26L34 26L34 25ZM24 27L24 28L25 28L25 27ZM6 28L6 29L7 29L7 28ZM12 29L12 30L13 30L13 29ZM18 29L18 30L19 30L19 29ZM20 29L20 30L22 30L22 29ZM26 30L26 31L27 31L27 32L28 32L28 34L27 34L27 35L24 35L24 36L23 36L23 35L22 35L22 34L20 34L20 32L19 32L19 35L21 35L21 36L22 36L22 37L23 37L23 38L24 38L24 37L25 37L25 38L26 38L26 37L25 37L25 36L28 36L28 34L30 34L30 35L32 35L32 32L30 32L30 33L29 33L29 31L28 31L28 30ZM16 31L16 32L17 32L17 31ZM33 33L33 36L36 36L36 33ZM12 34L12 35L13 35L13 34ZM15 34L15 35L14 35L14 36L15 36L15 37L14 37L14 38L11 38L11 37L10 37L10 36L8 36L8 41L9 41L9 40L10 40L10 41L15 41L15 39L14 39L14 38L17 38L17 37L16 37L16 36L15 36L15 35L17 35L17 34ZM34 34L34 35L35 35L35 34ZM12 36L12 37L13 37L13 36ZM19 36L19 37L20 37L20 36ZM29 36L29 38L30 38L30 36ZM31 36L31 37L32 37L32 36ZM9 37L9 38L10 38L10 39L11 39L11 38L10 38L10 37ZM35 37L35 38L36 38L36 37ZM20 38L20 39L22 39L22 38ZM12 39L12 40L14 40L14 39ZM16 39L16 41L17 41L17 39ZM32 40L32 41L33 41L33 40ZM0 0L0 7L7 7L7 0ZM1 1L1 6L6 6L6 1ZM2 2L2 5L5 5L5 2ZM34 0L34 7L41 7L41 0ZM35 1L35 6L40 6L40 1ZM36 2L36 5L39 5L39 2ZM0 34L0 41L7 41L7 34ZM1 35L1 40L6 40L6 35ZM2 36L2 39L5 39L5 36Z" fill="#000000"/></g></g></svg>\n	1	2025-07-09 15:23:18.966678+00	1	2025-07-09 15:23:18.966678+00	1	f
29	test12	test@gmail.com	$2b$10$Zm.GSffWUgSNMJ5frfJBtuQ.MxZ4Ds0JbvxaQZi8JM26mSIcBG3FG	BW7V2F2IWQVGQOMJ	<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="200" height="200" fill="#fefefe"/><g transform="scale(4.082)"><g transform="translate(4,4)"><path fill-rule="evenodd" d="M9 0L9 1L8 1L8 2L9 2L9 3L8 3L8 4L9 4L9 5L8 5L8 7L9 7L9 8L6 8L6 9L9 9L9 10L6 10L6 11L9 11L9 16L8 16L8 15L7 15L7 14L8 14L8 13L7 13L7 12L5 12L5 11L3 11L3 10L5 10L5 8L0 8L0 9L3 9L3 10L1 10L1 12L3 12L3 13L2 13L2 14L3 14L3 13L7 13L7 14L4 14L4 15L1 15L1 14L0 14L0 19L1 19L1 18L2 18L2 16L6 16L6 17L10 17L10 15L11 15L11 13L12 13L12 14L13 14L13 13L12 13L12 12L14 12L14 13L15 13L15 14L14 14L14 16L13 16L13 15L12 15L12 17L11 17L11 18L9 18L9 19L8 19L8 18L6 18L6 19L5 19L5 17L3 17L3 18L4 18L4 20L3 20L3 21L1 21L1 20L0 20L0 22L3 22L3 25L5 25L5 26L2 26L2 28L1 28L1 27L0 27L0 28L1 28L1 29L0 29L0 33L1 33L1 29L2 29L2 30L3 30L3 31L2 31L2 33L4 33L4 32L5 32L5 33L8 33L8 35L13 35L13 34L11 34L11 33L10 33L10 34L9 34L9 33L8 33L8 28L9 28L9 29L10 29L10 28L9 28L9 27L13 27L13 28L14 28L14 29L15 29L15 30L14 30L14 32L15 32L15 33L14 33L14 34L15 34L15 35L14 35L14 36L15 36L15 37L14 37L14 39L13 39L13 38L11 38L11 37L10 37L10 36L8 36L8 41L12 41L12 39L13 39L13 41L15 41L15 40L14 40L14 39L15 39L15 38L17 38L17 37L16 37L16 36L15 36L15 35L17 35L17 34L15 34L15 33L16 33L16 31L19 31L19 32L20 32L20 34L22 34L22 35L23 35L23 36L24 36L24 35L27 35L27 34L28 34L28 36L25 36L25 37L24 37L24 38L23 38L23 37L22 37L22 36L21 36L21 35L19 35L19 34L18 34L18 35L19 35L19 36L18 36L18 37L19 37L19 40L20 40L20 41L21 41L21 40L24 40L24 39L27 39L27 38L29 38L29 39L28 39L28 40L25 40L25 41L28 41L28 40L29 40L29 39L30 39L30 38L31 38L31 39L32 39L32 38L33 38L33 37L34 37L34 39L35 39L35 40L34 40L34 41L37 41L37 40L36 40L36 39L37 39L37 38L38 38L38 41L39 41L39 39L40 39L40 40L41 40L41 39L40 39L40 38L38 38L38 35L39 35L39 36L41 36L41 34L38 34L38 32L39 32L39 33L41 33L41 31L39 31L39 30L40 30L40 29L39 29L39 30L37 30L37 29L38 29L38 28L37 28L37 27L34 27L34 28L35 28L35 29L36 29L36 30L37 30L37 31L33 31L33 32L32 32L32 31L30 31L30 30L34 30L34 29L30 29L30 30L29 30L29 28L27 28L27 29L26 29L26 30L25 30L25 31L26 31L26 32L27 32L27 34L23 34L23 32L24 32L24 31L22 31L22 33L21 33L21 31L19 31L19 29L18 29L18 30L16 30L16 29L17 29L17 28L24 28L24 29L25 29L25 28L26 28L26 27L27 27L27 26L25 26L25 25L24 25L24 27L23 27L23 24L24 24L24 23L23 23L23 22L25 22L25 23L26 23L26 25L28 25L28 24L29 24L29 23L30 23L30 22L27 22L27 23L26 23L26 22L25 22L25 21L23 21L23 20L24 20L24 19L28 19L28 20L26 20L26 21L29 21L29 20L30 20L30 21L31 21L31 20L32 20L32 21L33 21L33 20L34 20L34 22L35 22L35 21L36 21L36 22L37 22L37 23L34 23L34 24L36 24L36 25L37 25L37 26L38 26L38 27L40 27L40 28L41 28L41 27L40 27L40 26L41 26L41 25L40 25L40 26L38 26L38 25L39 25L39 24L38 24L38 25L37 25L37 23L40 23L40 24L41 24L41 23L40 23L40 22L41 22L41 21L39 21L39 22L38 22L38 21L36 21L36 20L37 20L37 19L40 19L40 20L41 20L41 19L40 19L40 18L41 18L41 17L40 17L40 18L38 18L38 15L39 15L39 16L41 16L41 13L40 13L40 15L39 15L39 14L38 14L38 13L37 13L37 14L38 14L38 15L34 15L34 12L35 12L35 13L36 13L36 12L38 12L38 11L39 11L39 10L38 10L38 8L37 8L37 11L36 11L36 12L35 12L35 11L34 11L34 12L33 12L33 11L32 11L32 9L31 9L31 8L33 8L33 9L34 9L34 10L36 10L36 8L35 8L35 9L34 9L34 8L33 8L33 6L32 6L32 7L31 7L31 6L30 6L30 5L29 5L29 6L28 6L28 4L30 4L30 3L32 3L32 4L31 4L31 5L33 5L33 2L30 2L30 1L27 1L27 0L26 0L26 1L24 1L24 0L23 0L23 3L22 3L22 2L21 2L21 1L22 1L22 0L20 0L20 2L19 2L19 0L18 0L18 5L17 5L17 4L16 4L16 3L17 3L17 0L16 0L16 1L15 1L15 0L14 0L14 1L15 1L15 2L14 2L14 3L15 3L15 4L14 4L14 8L15 8L15 5L17 5L17 6L16 6L16 9L13 9L13 8L12 8L12 7L13 7L13 6L12 6L12 5L13 5L13 4L12 4L12 3L13 3L13 0L11 0L11 1L12 1L12 3L10 3L10 2L9 2L9 1L10 1L10 0ZM26 1L26 2L25 2L25 4L24 4L24 3L23 3L23 4L22 4L22 3L19 3L19 7L18 7L18 6L17 6L17 7L18 7L18 8L17 8L17 9L16 9L16 10L15 10L15 11L14 11L14 12L15 12L15 11L17 11L17 9L18 9L18 11L22 11L22 10L20 10L20 8L21 8L21 9L23 9L23 10L26 10L26 11L24 11L24 12L22 12L22 14L21 14L21 13L20 13L20 12L17 12L17 13L16 13L16 14L17 14L17 15L16 15L16 17L12 17L12 18L11 18L11 19L12 19L12 18L13 18L13 21L12 21L12 20L11 20L11 21L10 21L10 22L8 22L8 23L6 23L6 22L7 22L7 21L8 21L8 19L6 19L6 20L7 20L7 21L6 21L6 22L4 22L4 23L5 23L5 24L7 24L7 25L6 25L6 26L5 26L5 27L4 27L4 28L2 28L2 29L3 29L3 30L7 30L7 29L6 29L6 28L7 28L7 27L6 27L6 26L7 26L7 25L8 25L8 26L9 26L9 25L8 25L8 24L10 24L10 22L13 22L13 23L12 23L12 24L15 24L15 26L16 26L16 27L17 27L17 26L16 26L16 25L17 25L17 24L18 24L18 27L22 27L22 26L21 26L21 25L20 25L20 24L23 24L23 23L22 23L22 22L21 22L21 23L20 23L20 24L19 24L19 22L20 22L20 20L19 20L19 19L20 19L20 18L21 18L21 19L22 19L22 20L23 20L23 19L22 19L22 18L21 18L21 17L22 17L22 16L23 16L23 18L24 18L24 17L25 17L25 18L26 18L26 16L27 16L27 15L29 15L29 14L30 14L30 15L31 15L31 14L32 14L32 15L33 15L33 14L32 14L32 13L33 13L33 12L31 12L31 9L29 9L29 10L28 10L28 11L27 11L27 9L26 9L26 6L25 6L25 5L26 5L26 4L27 4L27 3L28 3L28 2L27 2L27 1ZM26 2L26 3L27 3L27 2ZM21 4L21 5L20 5L20 7L19 7L19 8L20 8L20 7L21 7L21 8L22 8L22 7L23 7L23 8L24 8L24 9L25 9L25 6L24 6L24 7L23 7L23 5L24 5L24 4L23 4L23 5L22 5L22 4ZM21 5L21 7L22 7L22 5ZM9 6L9 7L10 7L10 8L9 8L9 9L11 9L11 11L10 11L10 10L9 10L9 11L10 11L10 13L11 13L11 12L12 12L12 9L11 9L11 7L12 7L12 6L11 6L11 7L10 7L10 6ZM27 6L27 7L28 7L28 6ZM29 6L29 8L30 8L30 6ZM39 8L39 9L40 9L40 8ZM29 10L29 11L28 11L28 12L25 12L25 13L27 13L27 14L28 14L28 12L29 12L29 13L30 13L30 14L31 14L31 12L29 12L29 11L30 11L30 10ZM40 11L40 12L41 12L41 11ZM18 13L18 14L20 14L20 15L18 15L18 16L17 16L17 17L18 17L18 19L19 19L19 18L20 18L20 17L19 17L19 16L20 16L20 15L21 15L21 14L20 14L20 13ZM22 14L22 15L23 15L23 16L25 16L25 15L26 15L26 14L25 14L25 15L24 15L24 14ZM6 15L6 16L7 16L7 15ZM28 16L28 17L29 17L29 18L30 18L30 19L31 19L31 17L32 17L32 16L31 16L31 17L29 17L29 16ZM33 16L33 18L32 18L32 20L33 20L33 19L35 19L35 20L36 20L36 19L37 19L37 16L35 16L35 18L34 18L34 16ZM15 18L15 19L14 19L14 20L15 20L15 21L14 21L14 23L15 23L15 22L17 22L17 21L16 21L16 20L15 20L15 19L17 19L17 18ZM35 18L35 19L36 19L36 18ZM9 19L9 20L10 20L10 19ZM4 20L4 21L5 21L5 20ZM18 20L18 21L19 21L19 20ZM1 23L1 25L0 25L0 26L1 26L1 25L2 25L2 23ZM16 23L16 24L17 24L17 23ZM31 23L31 24L30 24L30 26L28 26L28 27L30 27L30 26L31 26L31 24L33 24L33 23ZM10 25L10 26L11 26L11 25ZM19 25L19 26L20 26L20 25ZM33 25L33 26L32 26L32 27L31 27L31 28L33 28L33 26L34 26L34 25ZM14 27L14 28L15 28L15 27ZM24 27L24 28L25 28L25 27ZM12 29L12 30L13 30L13 29ZM20 29L20 30L22 30L22 29ZM9 30L9 32L10 32L10 30ZM26 30L26 31L27 31L27 32L28 32L28 34L30 34L30 35L32 35L32 32L30 32L30 33L29 33L29 31L28 31L28 30ZM3 31L3 32L4 32L4 31ZM5 31L5 32L7 32L7 31ZM12 31L12 32L13 32L13 31ZM17 32L17 33L18 33L18 32ZM33 33L33 36L36 36L36 33ZM34 34L34 35L35 35L35 34ZM12 36L12 37L13 37L13 36ZM19 36L19 37L20 37L20 36ZM29 36L29 38L30 38L30 36ZM31 36L31 37L32 37L32 36ZM9 37L9 38L10 38L10 39L11 39L11 38L10 38L10 37ZM25 37L25 38L26 38L26 37ZM35 37L35 38L36 38L36 37ZM20 38L20 39L22 39L22 38ZM16 39L16 40L17 40L17 41L18 41L18 40L17 40L17 39ZM32 40L32 41L33 41L33 40ZM0 0L0 7L7 7L7 0ZM1 1L1 6L6 6L6 1ZM2 2L2 5L5 5L5 2ZM34 0L34 7L41 7L41 0ZM35 1L35 6L40 6L40 1ZM36 2L36 5L39 5L39 2ZM0 34L0 41L7 41L7 34ZM1 35L1 40L6 40L6 35ZM2 36L2 39L5 39L5 36Z" fill="#000000"/></g></g></svg>\n	1	2025-07-10 12:12:44.019906+00	1	2025-07-10 12:12:44.019906+00	1	f
1	admin	admin@casino.com	$2b$10$YQRnR/9U2NCOUFPnMT.JJ.SVi/Di4S5hzAgt0/4f3neMfmULWUKYq	Z3DVNBXEQRUPK5OV	<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="200" height="200" fill="#fefefe"/><g transform="scale(4.082)"><g transform="translate(4,4)"><path fill-rule="evenodd" d="M8 0L8 4L9 4L9 5L8 5L8 7L9 7L9 8L10 8L10 9L9 9L9 14L8 14L8 13L7 13L7 12L8 12L8 9L7 9L7 8L4 8L4 9L2 9L2 8L0 8L0 11L1 11L1 12L0 12L0 15L1 15L1 16L0 16L0 17L1 17L1 16L2 16L2 17L3 17L3 18L4 18L4 19L2 19L2 18L1 18L1 19L2 19L2 20L0 20L0 23L1 23L1 24L0 24L0 25L1 25L1 26L0 26L0 30L2 30L2 29L3 29L3 32L4 32L4 33L7 33L7 32L9 32L9 33L8 33L8 34L9 34L9 33L11 33L11 32L12 32L12 31L13 31L13 30L14 30L14 32L13 32L13 34L10 34L10 35L11 35L11 36L12 36L12 37L13 37L13 38L14 38L14 41L17 41L17 40L15 40L15 38L14 38L14 37L15 37L15 36L16 36L16 35L14 35L14 36L13 36L13 34L14 34L14 33L15 33L15 34L16 34L16 33L15 33L15 32L19 32L19 33L18 33L18 34L17 34L17 36L18 36L18 38L20 38L20 39L18 39L18 40L19 40L19 41L20 41L20 40L21 40L21 41L22 41L22 40L23 40L23 39L24 39L24 37L25 37L25 39L26 39L26 40L25 40L25 41L27 41L27 39L28 39L28 37L27 37L27 35L26 35L26 34L27 34L27 30L26 30L26 29L27 29L27 28L24 28L24 29L25 29L25 31L24 31L24 30L22 30L22 32L21 32L21 31L19 31L19 30L20 30L20 28L21 28L21 29L23 29L23 28L22 28L22 27L25 27L25 26L26 26L26 27L27 27L27 26L28 26L28 25L27 25L27 26L26 26L26 24L25 24L25 23L28 23L28 22L29 22L29 21L28 21L28 22L27 22L27 20L26 20L26 19L27 19L27 18L28 18L28 19L29 19L29 17L32 17L32 16L33 16L33 18L34 18L34 19L33 19L33 20L34 20L34 19L35 19L35 20L36 20L36 19L39 19L39 17L40 17L40 20L37 20L37 21L36 21L36 23L39 23L39 21L40 21L40 23L41 23L41 21L40 21L40 20L41 20L41 17L40 17L40 15L39 15L39 14L41 14L41 13L39 13L39 12L40 12L40 11L41 11L41 8L37 8L37 9L38 9L38 10L36 10L36 8L35 8L35 9L33 9L33 6L32 6L32 7L31 7L31 6L30 6L30 5L33 5L33 4L31 4L31 3L33 3L33 0L31 0L31 1L29 1L29 0L27 0L27 1L26 1L26 0L25 0L25 1L23 1L23 0L22 0L22 1L20 1L20 0L19 0L19 3L18 3L18 1L17 1L17 0L11 0L11 1L13 1L13 2L14 2L14 3L15 3L15 4L16 4L16 5L15 5L15 6L14 6L14 4L13 4L13 3L12 3L12 4L11 4L11 5L10 5L10 4L9 4L9 3L11 3L11 2L9 2L9 1L10 1L10 0ZM16 1L16 3L17 3L17 1ZM25 1L25 2L26 2L26 1ZM27 1L27 3L28 3L28 4L26 4L26 3L25 3L25 4L26 4L26 5L25 5L25 8L24 8L24 6L23 6L23 8L20 8L20 9L17 9L17 7L18 7L18 8L19 8L19 7L20 7L20 5L24 5L24 4L23 4L23 3L24 3L24 2L22 2L22 4L20 4L20 3L19 3L19 5L18 5L18 4L17 4L17 5L16 5L16 6L15 6L15 7L14 7L14 6L13 6L13 5L12 5L12 6L11 6L11 8L13 8L13 9L12 9L12 10L11 10L11 9L10 9L10 10L11 10L11 11L10 11L10 15L9 15L9 16L8 16L8 15L6 15L6 14L7 14L7 13L6 13L6 12L7 12L7 11L6 11L6 10L7 10L7 9L4 9L4 11L3 11L3 10L2 10L2 9L1 9L1 10L2 10L2 11L3 11L3 12L2 12L2 13L1 13L1 15L2 15L2 16L3 16L3 17L4 17L4 18L5 18L5 19L4 19L4 21L5 21L5 22L7 22L7 21L9 21L9 23L4 23L4 24L3 24L3 25L2 25L2 24L1 24L1 25L2 25L2 27L1 27L1 28L4 28L4 30L7 30L7 29L6 29L6 28L7 28L7 27L8 27L8 28L10 28L10 29L11 29L11 30L12 30L12 29L13 29L13 28L11 28L11 27L8 27L8 26L10 26L10 25L9 25L9 23L10 23L10 24L12 24L12 23L13 23L13 24L14 24L14 25L13 25L13 26L15 26L15 24L17 24L17 25L16 25L16 27L14 27L14 29L15 29L15 30L16 30L16 31L18 31L18 28L17 28L17 29L16 29L16 27L19 27L19 23L20 23L20 21L17 21L17 19L19 19L19 18L21 18L21 19L20 19L20 20L21 20L21 24L20 24L20 27L22 27L22 26L25 26L25 25L24 25L24 23L25 23L25 22L24 22L24 21L25 21L25 19L26 19L26 18L27 18L27 17L29 17L29 16L31 16L31 15L32 15L32 14L34 14L34 12L35 12L35 11L34 11L34 10L32 10L32 9L29 9L29 11L27 11L27 13L26 13L26 10L28 10L28 8L29 8L29 7L30 7L30 8L31 8L31 7L30 7L30 6L29 6L29 5L30 5L30 3L31 3L31 2L30 2L30 3L29 3L29 2L28 2L28 1ZM28 4L28 5L27 5L27 6L26 6L26 8L25 8L25 10L26 10L26 8L27 8L27 6L28 6L28 7L29 7L29 6L28 6L28 5L29 5L29 4ZM17 5L17 6L16 6L16 7L17 7L17 6L18 6L18 7L19 7L19 6L18 6L18 5ZM9 6L9 7L10 7L10 6ZM12 6L12 7L13 7L13 6ZM21 6L21 7L22 7L22 6ZM14 8L14 10L12 10L12 11L13 11L13 13L12 13L12 12L11 12L11 13L12 13L12 14L11 14L11 15L10 15L10 16L9 16L9 17L10 17L10 19L11 19L11 20L12 20L12 21L13 21L13 22L14 22L14 23L15 23L15 22L14 22L14 21L15 21L15 20L16 20L16 19L17 19L17 17L18 17L18 18L19 18L19 17L20 17L20 16L21 16L21 15L20 15L20 14L21 14L21 13L22 13L22 14L23 14L23 15L22 15L22 16L23 16L23 15L24 15L24 18L23 18L23 17L22 17L22 19L25 19L25 18L26 18L26 17L27 17L27 14L26 14L26 13L25 13L25 15L24 15L24 13L22 13L22 11L21 11L21 9L20 9L20 11L18 11L18 12L19 12L19 14L18 14L18 15L16 15L16 14L15 14L15 13L14 13L14 11L15 11L15 12L16 12L16 13L17 13L17 12L16 12L16 10L17 10L17 9L16 9L16 8ZM22 9L22 10L23 10L23 11L24 11L24 12L25 12L25 11L24 11L24 10L23 10L23 9ZM39 9L39 11L38 11L38 12L39 12L39 11L40 11L40 9ZM30 10L30 11L29 11L29 12L30 12L30 13L31 13L31 14L30 14L30 15L31 15L31 14L32 14L32 13L33 13L33 12L34 12L34 11L32 11L32 10ZM5 11L5 12L6 12L6 11ZM30 11L30 12L31 12L31 11ZM36 11L36 12L37 12L37 11ZM20 12L20 13L21 13L21 12ZM3 13L3 14L2 14L2 15L4 15L4 14L6 14L6 13ZM36 13L36 14L35 14L35 15L34 15L34 16L35 16L35 19L36 19L36 18L38 18L38 13ZM13 14L13 15L12 15L12 16L11 16L11 17L13 17L13 15L14 15L14 14ZM28 14L28 15L29 15L29 14ZM36 14L36 15L35 15L35 16L36 16L36 15L37 15L37 14ZM5 15L5 18L6 18L6 19L5 19L5 21L7 21L7 20L9 20L9 18L8 18L8 17L7 17L7 16L6 16L6 15ZM25 15L25 17L26 17L26 15ZM15 16L15 18L11 18L11 19L13 19L13 20L14 20L14 19L15 19L15 18L16 18L16 17L17 17L17 16ZM6 17L6 18L7 18L7 17ZM30 18L30 19L31 19L31 21L30 21L30 23L29 23L29 24L30 24L30 27L28 27L28 29L30 29L30 27L31 27L31 30L30 30L30 31L31 31L31 34L30 34L30 35L31 35L31 37L33 37L33 38L35 38L35 37L36 37L36 38L37 38L37 39L36 39L36 40L35 40L35 39L34 39L34 41L37 41L37 40L38 40L38 41L40 41L40 40L38 40L38 39L41 39L41 38L40 38L40 37L39 37L39 36L38 36L38 35L39 35L39 34L40 34L40 35L41 35L41 34L40 34L40 33L41 33L41 32L40 32L40 31L41 31L41 30L40 30L40 31L39 31L39 29L40 29L40 28L41 28L41 27L39 27L39 26L41 26L41 25L40 25L40 24L39 24L39 25L38 25L38 27L39 27L39 28L38 28L38 30L37 30L37 28L35 28L35 29L33 29L33 28L34 28L34 27L37 27L37 26L34 26L34 27L33 27L33 25L34 25L34 24L33 24L33 23L32 23L32 22L31 22L31 21L32 21L32 18ZM6 19L6 20L7 20L7 19ZM22 20L22 22L23 22L23 20ZM16 21L16 23L17 23L17 24L18 24L18 23L19 23L19 22L18 22L18 23L17 23L17 21ZM33 21L33 22L34 22L34 23L35 23L35 22L34 22L34 21ZM37 21L37 22L38 22L38 21ZM2 22L2 23L3 23L3 22ZM22 23L22 25L23 25L23 23ZM4 24L4 26L6 26L6 27L7 27L7 26L8 26L8 24L6 24L6 25L5 25L5 24ZM36 24L36 25L37 25L37 24ZM6 25L6 26L7 26L7 25ZM11 25L11 26L12 26L12 25ZM31 26L31 27L32 27L32 26ZM4 27L4 28L5 28L5 27ZM8 30L8 31L9 31L9 30ZM28 30L28 31L29 31L29 30ZM31 30L31 31L32 31L32 30ZM33 30L33 31L34 31L34 32L37 32L37 34L38 34L38 33L40 33L40 32L39 32L39 31L34 31L34 30ZM6 31L6 32L7 32L7 31ZM23 31L23 33L21 33L21 32L20 32L20 33L19 33L19 34L18 34L18 36L19 36L19 34L20 34L20 35L22 35L22 34L24 34L24 35L23 35L23 37L21 37L21 39L23 39L23 37L24 37L24 36L26 36L26 35L25 35L25 33L26 33L26 31L25 31L25 32L24 32L24 31ZM0 32L0 33L2 33L2 32ZM29 32L29 33L30 33L30 32ZM33 33L33 36L36 36L36 33ZM31 34L31 35L32 35L32 34ZM34 34L34 35L35 35L35 34ZM8 35L8 37L9 37L9 39L8 39L8 41L13 41L13 39L12 39L12 40L11 40L11 38L10 38L10 36L9 36L9 35ZM29 36L29 37L30 37L30 36ZM37 36L37 38L38 38L38 36ZM16 37L16 39L17 39L17 37ZM26 37L26 39L27 39L27 37ZM30 38L30 39L29 39L29 40L31 40L31 41L32 41L32 40L33 40L33 39L32 39L32 38ZM9 39L9 40L10 40L10 39ZM0 0L0 7L7 7L7 0ZM1 1L1 6L6 6L6 1ZM2 2L2 5L5 5L5 2ZM34 0L34 7L41 7L41 0ZM35 1L35 6L40 6L40 1ZM36 2L36 5L39 5L39 2ZM0 34L0 41L7 41L7 34ZM1 35L1 40L6 40L6 35ZM2 36L2 39L5 39L5 36Z" fill="#000000"/></g></g></svg>\n	1	2025-07-03 03:27:32.047524+00	1	2025-07-03 03:27:32.047524+00	1	f
30	thinkcode	thinkcode0215@gmail.com	$2b$10$MkrtoIrVjvvzd4dEUoYRhe2Vez8dfhSytKEKKb2l6FKl.qnqHPukS	RKUBSVDMMCM36ZOP	<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="200" height="200" fill="#fefefe"/><g transform="scale(4.082)"><g transform="translate(4,4)"><path fill-rule="evenodd" d="M10 0L10 1L8 1L8 2L10 2L10 1L11 1L11 2L12 2L12 3L11 3L11 4L13 4L13 3L14 3L14 4L15 4L15 5L14 5L14 8L13 8L13 6L12 6L12 8L11 8L11 9L10 9L10 8L6 8L6 9L9 9L9 10L8 10L8 11L9 11L9 13L10 13L10 11L9 11L9 10L11 10L11 13L13 13L13 12L12 12L12 11L13 11L13 10L12 10L12 8L13 8L13 9L14 9L14 8L15 8L15 11L14 11L14 12L15 12L15 13L14 13L14 15L13 15L13 14L10 14L10 15L9 15L9 14L8 14L8 16L9 16L9 17L10 17L10 18L11 18L11 19L9 19L9 20L8 20L8 19L7 19L7 18L6 18L6 19L5 19L5 17L7 17L7 16L6 16L6 15L7 15L7 14L6 14L6 13L8 13L8 12L6 12L6 11L7 11L7 10L6 10L6 11L5 11L5 10L3 10L3 11L2 11L2 12L3 12L3 11L5 11L5 12L4 12L4 15L3 15L3 14L1 14L1 15L0 15L0 20L1 20L1 22L0 22L0 26L2 26L2 25L1 25L1 23L2 23L2 22L3 22L3 21L5 21L5 22L4 22L4 26L5 26L5 27L4 27L4 29L7 29L7 28L8 28L8 29L9 29L9 31L10 31L10 29L9 29L9 28L11 28L11 27L8 27L8 26L10 26L10 25L11 25L11 22L10 22L10 25L8 25L8 26L5 26L5 24L6 24L6 25L7 25L7 24L6 24L6 23L8 23L8 24L9 24L9 21L11 21L11 19L13 19L13 20L14 20L14 21L18 21L18 22L14 22L14 26L15 26L15 27L14 27L14 28L15 28L15 29L14 29L14 31L15 31L15 30L16 30L16 31L18 31L18 30L17 30L17 28L18 28L18 29L19 29L19 30L20 30L20 31L19 31L19 32L15 32L15 33L19 33L19 32L20 32L20 33L21 33L21 34L22 34L22 35L23 35L23 36L24 36L24 35L25 35L25 36L26 36L26 38L25 38L25 39L24 39L24 38L23 38L23 37L22 37L22 36L21 36L21 35L18 35L18 34L17 34L17 35L16 35L16 34L14 34L14 32L12 32L12 31L13 31L13 30L11 30L11 34L12 34L12 33L13 33L13 36L14 36L14 37L15 37L15 38L14 38L14 40L13 40L13 39L12 39L12 40L13 40L13 41L14 41L14 40L15 40L15 41L17 41L17 39L18 39L18 40L20 40L20 41L23 41L23 40L24 40L24 41L25 41L25 39L28 39L28 38L29 38L29 39L30 39L30 38L31 38L31 39L32 39L32 40L33 40L33 39L32 39L32 38L33 38L33 37L34 37L34 39L35 39L35 40L34 40L34 41L37 41L37 40L36 40L36 39L38 39L38 35L39 35L39 36L40 36L40 35L41 35L41 34L40 34L40 35L39 35L39 34L38 34L38 33L41 33L41 31L36 31L36 32L35 32L35 31L33 31L33 28L37 28L37 29L35 29L35 30L38 30L38 28L37 28L37 27L33 27L33 26L34 26L34 25L33 25L33 26L32 26L32 27L31 27L31 28L32 28L32 30L31 30L31 29L30 29L30 30L29 30L29 31L28 31L28 29L29 29L29 28L27 28L27 30L25 30L25 29L23 29L23 28L26 28L26 27L27 27L27 25L28 25L28 24L29 24L29 23L30 23L30 22L29 22L29 21L30 21L30 20L32 20L32 18L33 18L33 16L34 16L34 18L35 18L35 19L34 19L34 20L35 20L35 21L37 21L37 23L34 23L34 24L36 24L36 25L37 25L37 26L38 26L38 27L39 27L39 28L40 28L40 26L41 26L41 25L40 25L40 26L38 26L38 25L39 25L39 23L40 23L40 24L41 24L41 21L40 21L40 22L39 22L39 23L38 23L38 21L37 21L37 19L39 19L39 20L40 20L40 19L41 19L41 18L40 18L40 19L39 19L39 18L38 18L38 17L39 17L39 16L41 16L41 13L40 13L40 12L41 12L41 11L40 11L40 10L41 10L41 9L40 9L40 8L39 8L39 9L40 9L40 10L38 10L38 8L37 8L37 11L36 11L36 12L35 12L35 11L34 11L34 12L33 12L33 11L32 11L32 9L31 9L31 8L33 8L33 9L34 9L34 10L36 10L36 8L35 8L35 9L34 9L34 8L33 8L33 6L32 6L32 7L31 7L31 6L30 6L30 5L29 5L29 4L31 4L31 5L32 5L32 4L33 4L33 2L30 2L30 1L29 1L29 2L28 2L28 3L27 3L27 1L28 1L28 0L26 0L26 1L25 1L25 2L23 2L23 3L22 3L22 2L19 2L19 3L18 3L18 5L17 5L17 6L16 6L16 3L14 3L14 2L15 2L15 1L16 1L16 2L18 2L18 1L17 1L17 0L13 0L13 2L12 2L12 1L11 1L11 0ZM19 0L19 1L20 1L20 0ZM21 0L21 1L23 1L23 0ZM25 2L25 3L23 3L23 4L22 4L22 3L19 3L19 4L22 4L22 5L18 5L18 6L17 6L17 7L16 7L16 6L15 6L15 7L16 7L16 9L17 9L17 10L18 10L18 11L17 11L17 12L16 12L16 11L15 11L15 12L16 12L16 14L18 14L18 15L20 15L20 16L17 16L17 15L14 15L14 17L15 17L15 16L17 16L17 18L16 18L16 19L14 19L14 20L16 20L16 19L17 19L17 20L19 20L19 22L20 22L20 20L19 20L19 18L20 18L20 19L21 19L21 20L22 20L22 21L23 21L23 22L21 22L21 23L20 23L20 24L19 24L19 23L18 23L18 25L17 25L17 23L15 23L15 24L16 24L16 25L15 25L15 26L18 26L18 27L19 27L19 26L20 26L20 27L22 27L22 28L21 28L21 29L20 29L20 28L19 28L19 29L20 29L20 30L21 30L21 31L22 31L22 32L21 32L21 33L22 33L22 32L23 32L23 35L24 35L24 34L26 34L26 33L25 33L25 30L23 30L23 31L22 31L22 30L21 30L21 29L22 29L22 28L23 28L23 27L25 27L25 26L26 26L26 25L27 25L27 24L28 24L28 23L29 23L29 22L27 22L27 21L26 21L26 19L25 19L25 18L26 18L26 17L27 17L27 16L28 16L28 17L29 17L29 18L30 18L30 19L31 19L31 17L32 17L32 16L31 16L31 17L29 17L29 16L28 16L28 15L29 15L29 14L30 14L30 15L33 15L33 14L34 14L34 15L35 15L35 14L36 14L36 15L37 15L37 14L39 14L39 15L38 15L38 16L35 16L35 18L36 18L36 19L35 19L35 20L36 20L36 19L37 19L37 17L38 17L38 16L39 16L39 15L40 15L40 13L39 13L39 12L40 12L40 11L38 11L38 12L36 12L36 13L35 13L35 12L34 12L34 13L32 13L32 12L31 12L31 9L29 9L29 8L30 8L30 6L29 6L29 5L28 5L28 4L27 4L27 3L26 3L26 2ZM8 3L8 4L9 4L9 5L8 5L8 7L9 7L9 6L10 6L10 7L11 7L11 6L10 6L10 4L9 4L9 3ZM25 3L25 4L24 4L24 5L25 5L25 6L24 6L24 7L23 7L23 6L22 6L22 7L21 7L21 6L20 6L20 7L19 7L19 6L18 6L18 7L17 7L17 9L18 9L18 8L20 8L20 7L21 7L21 9L19 9L19 11L18 11L18 12L20 12L20 10L22 10L22 11L21 11L21 13L19 13L19 14L20 14L20 15L21 15L21 17L20 17L20 18L22 18L22 19L23 19L23 20L24 20L24 22L23 22L23 23L21 23L21 24L20 24L20 25L21 25L21 26L22 26L22 27L23 27L23 26L22 26L22 24L23 24L23 23L27 23L27 22L25 22L25 19L23 19L23 18L25 18L25 17L26 17L26 15L28 15L28 14L29 14L29 11L30 11L30 10L29 10L29 11L28 11L28 12L27 12L27 13L26 13L26 14L25 14L25 13L24 13L24 15L25 15L25 16L24 16L24 17L23 17L23 15L21 15L21 14L22 14L22 13L23 13L23 12L26 12L26 11L27 11L27 10L28 10L28 8L29 8L29 6L28 6L28 8L26 8L26 7L27 7L27 5L25 5L25 4L26 4L26 3ZM31 3L31 4L32 4L32 3ZM25 6L25 7L26 7L26 6ZM22 7L22 8L23 8L23 11L22 11L22 12L23 12L23 11L25 11L25 10L27 10L27 9L25 9L25 8L23 8L23 7ZM0 8L0 9L5 9L5 8ZM24 9L24 10L25 10L25 9ZM0 10L0 11L1 11L1 10ZM0 12L0 13L1 13L1 12ZM5 12L5 13L6 13L6 12ZM30 12L30 14L31 14L31 12ZM27 13L27 14L28 14L28 13ZM34 13L34 14L35 14L35 13ZM36 13L36 14L37 14L37 13ZM5 14L5 15L4 15L4 16L3 16L3 15L2 15L2 16L3 16L3 17L1 17L1 18L3 18L3 17L4 17L4 16L5 16L5 15L6 15L6 14ZM10 15L10 17L11 17L11 18L13 18L13 15L12 15L12 17L11 17L11 15ZM22 17L22 18L23 18L23 17ZM17 18L17 19L18 19L18 18ZM1 19L1 20L3 20L3 19ZM4 19L4 20L5 20L5 21L6 21L6 22L7 22L7 21L8 21L8 20L7 20L7 19L6 19L6 20L5 20L5 19ZM27 19L27 20L28 20L28 21L29 21L29 20L28 20L28 19ZM6 20L6 21L7 21L7 20ZM12 21L12 22L13 22L13 21ZM31 21L31 24L30 24L30 26L28 26L28 27L30 27L30 26L31 26L31 24L33 24L33 23L32 23L32 21ZM12 23L12 25L13 25L13 23ZM37 23L37 25L38 25L38 23ZM24 24L24 26L25 26L25 25L26 25L26 24ZM12 26L12 27L13 27L13 26ZM0 27L0 28L1 28L1 27ZM5 27L5 28L7 28L7 27ZM15 27L15 28L16 28L16 27ZM12 28L12 29L13 29L13 28ZM0 29L0 33L1 33L1 29ZM2 29L2 31L3 31L3 32L2 32L2 33L3 33L3 32L4 32L4 33L5 33L5 32L6 32L6 33L7 33L7 32L8 32L8 31L7 31L7 30L5 30L5 31L4 31L4 30L3 30L3 29ZM39 29L39 30L40 30L40 29ZM30 30L30 31L31 31L31 30ZM6 31L6 32L7 32L7 31ZM26 31L26 32L28 32L28 34L27 34L27 35L26 35L26 36L28 36L28 37L27 37L27 38L28 38L28 37L29 37L29 38L30 38L30 36L31 36L31 37L32 37L32 36L31 36L31 35L32 35L32 32L33 32L33 31L32 31L32 32L30 32L30 33L29 33L29 32L28 32L28 31ZM9 32L9 33L8 33L8 35L9 35L9 36L8 36L8 41L9 41L9 38L11 38L11 35L9 35L9 33L10 33L10 32ZM33 33L33 36L36 36L36 33ZM28 34L28 36L30 36L30 34ZM34 34L34 35L35 35L35 34ZM14 35L14 36L16 36L16 37L17 37L17 38L16 38L16 39L15 39L15 40L16 40L16 39L17 39L17 38L18 38L18 39L20 39L20 37L21 37L21 36L18 36L18 37L17 37L17 36L16 36L16 35ZM12 37L12 38L13 38L13 37ZM35 37L35 38L36 38L36 37ZM21 38L21 40L23 40L23 39L22 39L22 38ZM39 38L39 39L40 39L40 40L41 40L41 39L40 39L40 38ZM26 40L26 41L28 41L28 40ZM0 0L0 7L7 7L7 0ZM1 1L1 6L6 6L6 1ZM2 2L2 5L5 5L5 2ZM34 0L34 7L41 7L41 0ZM35 1L35 6L40 6L40 1ZM36 2L36 5L39 5L39 2ZM0 34L0 41L7 41L7 34ZM1 35L1 40L6 40L6 35ZM2 36L2 39L5 39L5 36Z" fill="#000000"/></g></g></svg>\n	1	2025-07-12 07:33:09.54405+00	1	2025-07-12 07:33:09.54405+00	1	f
20	player3	newuser@email.com	$2b$10$YQRnR/9U2NCOUFPnMT.JJ.SVi/Di4S5hzAgt0/4f3neMfmULWUKYq	\N	\N	1	2025-07-05 02:03:34.735386+00	1	2025-07-05 02:03:34.735386+00	1	f
24	amir	amir@email.com	$2b$10$O/0M5zh2uktaDDwojMrSpeo7lvh2icJleUMrXgz64.6RWuewb449O	VRMYHA676NUCNDPF	<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="200" viewBox="0 0 200 200"><rect x="0" y="0" width="200" height="200" fill="#fefefe"/><g transform="scale(4.082)"><g transform="translate(4,4)"><path fill-rule="evenodd" d="M8 0L8 1L11 1L11 3L15 3L15 4L16 4L16 5L13 5L13 4L12 4L12 5L10 5L10 4L9 4L9 2L8 2L8 5L10 5L10 7L9 7L9 6L8 6L8 7L9 7L9 8L8 8L8 9L9 9L9 10L6 10L6 9L7 9L7 8L6 8L6 9L4 9L4 8L0 8L0 13L1 13L1 12L2 12L2 13L3 13L3 14L1 14L1 15L0 15L0 17L1 17L1 18L0 18L0 20L2 20L2 21L0 21L0 25L1 25L1 23L2 23L2 22L4 22L4 23L3 23L3 24L2 24L2 26L3 26L3 27L5 27L5 29L4 29L4 30L2 30L2 29L3 29L3 28L2 28L2 27L0 27L0 29L1 29L1 30L0 30L0 31L1 31L1 30L2 30L2 32L1 32L1 33L2 33L2 32L3 32L3 33L5 33L5 29L7 29L7 30L6 30L6 31L7 31L7 30L8 30L8 29L9 29L9 28L10 28L10 30L9 30L9 31L8 31L8 32L6 32L6 33L8 33L8 34L11 34L11 35L9 35L9 36L12 36L12 37L11 37L11 39L10 39L10 40L9 40L9 37L8 37L8 41L11 41L11 40L12 40L12 41L14 41L14 40L15 40L15 39L14 39L14 40L12 40L12 38L13 38L13 36L15 36L15 37L16 37L16 35L17 35L17 33L18 33L18 34L19 34L19 35L18 35L18 36L17 36L17 39L18 39L18 40L16 40L16 41L19 41L19 40L20 40L20 41L21 41L21 40L20 40L20 39L22 39L22 38L24 38L24 37L23 37L23 36L24 36L24 35L25 35L25 33L23 33L23 32L22 32L22 31L23 31L23 30L22 30L22 31L18 31L18 30L19 30L19 28L20 28L20 30L21 30L21 29L22 29L22 28L23 28L23 29L25 29L25 31L27 31L27 32L28 32L28 33L27 33L27 37L26 37L26 38L28 38L28 40L29 40L29 41L31 41L31 40L32 40L32 41L33 41L33 40L32 40L32 39L31 39L31 38L32 38L32 37L33 37L33 39L34 39L34 38L35 38L35 40L34 40L34 41L35 41L35 40L36 40L36 37L37 37L37 38L38 38L38 39L39 39L39 38L40 38L40 40L39 40L39 41L40 41L40 40L41 40L41 38L40 38L40 37L38 37L38 36L37 36L37 35L38 35L38 33L37 33L37 32L35 32L35 31L36 31L36 30L35 30L35 31L34 31L34 32L32 32L32 31L31 31L31 32L29 32L29 31L30 31L30 30L31 30L31 29L30 29L30 28L34 28L34 29L35 29L35 28L36 28L36 29L40 29L40 30L41 30L41 29L40 29L40 26L41 26L41 25L40 25L40 26L39 26L39 24L40 24L40 23L41 23L41 22L40 22L40 21L41 21L41 20L39 20L39 18L37 18L37 16L38 16L38 14L39 14L39 17L40 17L40 18L41 18L41 17L40 17L40 16L41 16L41 15L40 15L40 14L41 14L41 13L37 13L37 12L35 12L35 13L34 13L34 10L35 10L35 11L38 11L38 9L39 9L39 10L40 10L40 9L41 9L41 8L40 8L40 9L39 9L39 8L36 8L36 9L34 9L34 8L33 8L33 9L34 9L34 10L32 10L32 7L33 7L33 6L32 6L32 7L31 7L31 5L32 5L32 4L33 4L33 1L32 1L32 4L31 4L31 5L30 5L30 4L28 4L28 2L29 2L29 0L28 0L28 2L27 2L27 4L26 4L26 7L27 7L27 8L25 8L25 6L24 6L24 4L23 4L23 3L24 3L24 2L26 2L26 1L27 1L27 0L26 0L26 1L25 1L25 0L24 0L24 1L22 1L22 0L19 0L19 1L18 1L18 2L17 2L17 3L18 3L18 4L16 4L16 3L15 3L15 2L16 2L16 1L17 1L17 0L14 0L14 2L13 2L13 0ZM20 1L20 2L18 2L18 3L19 3L19 4L21 4L21 5L22 5L22 6L21 6L21 7L20 7L20 6L19 6L19 7L20 7L20 8L21 8L21 9L23 9L23 10L26 10L26 11L24 11L24 12L22 12L22 13L20 13L20 11L18 11L18 10L20 10L20 9L19 9L19 8L18 8L18 9L15 9L15 7L16 7L16 6L15 6L15 7L14 7L14 6L13 6L13 5L12 5L12 6L11 6L11 7L10 7L10 8L9 8L9 9L11 9L11 10L12 10L12 11L13 11L13 12L11 12L11 11L10 11L10 10L9 10L9 12L8 12L8 13L6 13L6 12L7 12L7 11L6 11L6 10L5 10L5 11L2 11L2 10L1 10L1 11L2 11L2 12L3 12L3 13L4 13L4 12L5 12L5 13L6 13L6 14L8 14L8 15L6 15L6 16L7 16L7 17L6 17L6 18L5 18L5 19L6 19L6 20L4 20L4 18L3 18L3 19L2 19L2 18L1 18L1 19L2 19L2 20L3 20L3 21L4 21L4 22L5 22L5 24L7 24L7 25L4 25L4 24L3 24L3 25L4 25L4 26L8 26L8 24L9 24L9 27L10 27L10 28L13 28L13 29L11 29L11 30L10 30L10 31L9 31L9 32L10 32L10 31L12 31L12 32L11 32L11 33L12 33L12 34L13 34L13 35L12 35L12 36L13 36L13 35L14 35L14 34L15 34L15 35L16 35L16 34L15 34L15 33L16 33L16 32L17 32L17 30L18 30L18 29L17 29L17 26L16 26L16 24L19 24L19 25L20 25L20 23L21 23L21 24L22 24L22 25L21 25L21 26L20 26L20 27L21 27L21 26L22 26L22 27L24 27L24 26L27 26L27 25L26 25L26 24L27 24L27 23L28 23L28 27L27 27L27 29L28 29L28 30L27 30L27 31L29 31L29 30L30 30L30 29L28 29L28 28L30 28L30 27L29 27L29 25L30 25L30 26L32 26L32 25L33 25L33 26L35 26L35 27L36 27L36 26L35 26L35 25L36 25L36 24L37 24L37 25L38 25L38 24L39 24L39 23L40 23L40 22L39 22L39 20L38 20L38 19L37 19L37 18L36 18L36 17L34 17L34 19L35 19L35 18L36 18L36 21L37 21L37 23L36 23L36 22L35 22L35 20L34 20L34 21L32 21L32 22L34 22L34 24L32 24L32 23L31 23L31 25L30 25L30 21L28 21L28 20L27 20L27 19L29 19L29 18L30 18L30 17L31 17L31 18L32 18L32 19L33 19L33 18L32 18L32 17L33 17L33 16L28 16L28 15L27 15L27 17L28 17L28 18L26 18L26 20L27 20L27 22L26 22L26 21L25 21L25 19L24 19L24 17L22 17L22 16L23 16L23 15L24 15L24 16L26 16L26 14L29 14L29 13L30 13L30 14L32 14L32 13L33 13L33 15L34 15L34 13L33 13L33 12L32 12L32 11L31 11L31 13L30 13L30 12L29 12L29 11L30 11L30 10L31 10L31 7L30 7L30 6L29 6L29 5L28 5L28 4L27 4L27 7L28 7L28 6L29 6L29 7L30 7L30 9L29 9L29 8L27 8L27 9L29 9L29 10L26 10L26 9L25 9L25 8L24 8L24 6L23 6L23 5L22 5L22 2L21 2L21 1ZM30 1L30 3L31 3L31 1ZM12 6L12 7L11 7L11 8L12 8L12 9L13 9L13 11L14 11L14 10L15 10L15 9L14 9L14 7L13 7L13 6ZM17 6L17 7L18 7L18 6ZM22 6L22 7L23 7L23 6ZM12 7L12 8L13 8L13 7ZM36 9L36 10L37 10L37 9ZM16 10L16 11L17 11L17 12L14 12L14 14L12 14L12 13L11 13L11 12L9 12L9 13L11 13L11 14L9 14L9 17L10 17L10 18L9 18L9 19L8 19L8 17L7 17L7 18L6 18L6 19L8 19L8 20L6 20L6 21L7 21L7 22L6 22L6 23L7 23L7 24L8 24L8 22L9 22L9 23L11 23L11 24L10 24L10 26L11 26L11 27L12 27L12 26L14 26L14 27L13 27L13 28L14 28L14 27L16 27L16 26L14 26L14 25L13 25L13 24L14 24L14 23L11 23L11 22L9 22L9 21L10 21L10 20L9 20L9 19L11 19L11 20L13 20L13 21L14 21L14 22L15 22L15 24L16 24L16 22L17 22L17 20L18 20L18 23L19 23L19 21L20 21L20 18L21 18L21 17L20 17L20 18L19 18L19 16L21 16L21 15L22 15L22 14L25 14L25 12L24 12L24 13L22 13L22 14L21 14L21 15L20 15L20 14L19 14L19 13L18 13L18 11L17 11L17 10ZM5 11L5 12L6 12L6 11ZM27 11L27 12L26 12L26 13L29 13L29 12L28 12L28 11ZM39 11L39 12L41 12L41 11ZM15 13L15 15L14 15L14 16L13 16L13 17L14 17L14 18L12 18L12 17L11 17L11 19L13 19L13 20L14 20L14 21L16 21L16 19L15 19L15 17L16 17L16 18L18 18L18 20L19 20L19 18L18 18L18 17L17 17L17 16L18 16L18 15L17 15L17 13ZM35 13L35 15L36 15L36 14L37 14L37 13ZM3 14L3 15L2 15L2 16L1 16L1 17L2 17L2 16L3 16L3 17L5 17L5 16L3 16L3 15L4 15L4 14ZM11 14L11 16L12 16L12 14ZM15 15L15 16L14 16L14 17L15 17L15 16L16 16L16 15ZM22 18L22 20L23 20L23 18ZM30 19L30 20L31 20L31 19ZM37 20L37 21L38 21L38 20ZM21 21L21 23L22 23L22 24L24 24L24 25L25 25L25 24L26 24L26 22L25 22L25 24L24 24L24 21L23 21L23 22L22 22L22 21ZM28 22L28 23L29 23L29 22ZM35 23L35 24L36 24L36 23ZM11 25L11 26L12 26L12 25ZM22 25L22 26L23 26L23 25ZM18 26L18 28L19 28L19 26ZM6 27L6 28L8 28L8 27ZM25 27L25 28L26 28L26 27ZM37 27L37 28L39 28L39 27ZM13 29L13 31L14 31L14 29ZM16 29L16 30L15 30L15 31L16 31L16 30L17 30L17 29ZM38 30L38 31L39 31L39 30ZM3 31L3 32L4 32L4 31ZM40 31L40 32L41 32L41 31ZM14 32L14 33L15 33L15 32ZM18 32L18 33L19 33L19 32ZM20 32L20 33L22 33L22 32ZM28 33L28 34L29 34L29 35L28 35L28 36L29 36L29 37L30 37L30 38L31 38L31 37L32 37L32 33ZM33 33L33 36L36 36L36 33ZM40 33L40 34L41 34L41 33ZM22 34L22 36L23 36L23 34ZM30 34L30 35L29 35L29 36L30 36L30 35L31 35L31 34ZM34 34L34 35L35 35L35 34ZM19 35L19 37L20 37L20 38L22 38L22 37L21 37L21 35ZM40 35L40 36L41 36L41 35ZM26 39L26 40L25 40L25 41L27 41L27 39ZM29 39L29 40L31 40L31 39ZM22 40L22 41L24 41L24 40ZM37 40L37 41L38 41L38 40ZM0 0L0 7L7 7L7 0ZM1 1L1 6L6 6L6 1ZM2 2L2 5L5 5L5 2ZM34 0L34 7L41 7L41 0ZM35 1L35 6L40 6L40 1ZM36 2L36 5L39 5L39 2ZM0 34L0 41L7 41L7 34ZM1 35L1 40L6 40L6 35ZM2 36L2 39L5 39L5 36Z" fill="#000000"/></g></g></svg>\n	1	2025-07-09 11:32:12.993721+00	1	2025-07-09 11:32:12.993721+00	1	f
\.


--
-- Name: bets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bets_id_seq', 4, true);


--
-- Name: default_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.default_templates_id_seq', 5, true);


--
-- Name: game_provider_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.game_provider_configs_id_seq', 1, true);


--
-- Name: games_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.games_id_seq', 64, true);


--
-- Name: ggr_audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ggr_audit_log_id_seq', 1, false);


--
-- Name: ggr_filter_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ggr_filter_settings_id_seq', 1, true);


--
-- Name: kyc_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.kyc_documents_id_seq', 1, false);


--
-- Name: moduals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.moduals_id_seq', 32, true);


--
-- Name: payment_gateways_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_gateways_id_seq', 7, true);


--
-- Name: promotions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.promotions_id_seq', 4, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 9, true);


--
-- Name: rtp_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rtp_settings_id_seq', 1, false);


--
-- Name: statuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.statuses_id_seq', 4, true);


--
-- Name: template_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.template_configs_id_seq', 18, true);


--
-- Name: template_features_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.template_features_id_seq', 16, true);


--
-- Name: templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.templates_id_seq', 8, true);


--
-- Name: tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tokens_id_seq', 654, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 176, true);


--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_activity_logs_id_seq', 801, true);


--
-- Name: user_game_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_game_preferences_id_seq', 1, false);


--
-- Name: user_level_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_level_progress_id_seq', 14, true);


--
-- Name: user_levels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_levels_id_seq', 5, true);


--
-- Name: user_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_profiles_id_seq', 14, true);


--
-- Name: user_promotions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_promotions_id_seq', 1, false);


--
-- Name: user_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_roles_id_seq', 14, true);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_sessions_id_seq', 1, false);


--
-- Name: user_template_features_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_template_features_id_seq', 1, false);


--
-- Name: user_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_templates_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 30, true);


--
-- Name: bets bets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_pkey PRIMARY KEY (id);


--
-- Name: captcha captcha_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.captcha
    ADD CONSTRAINT captcha_pkey PRIMARY KEY (id);


--
-- Name: default_templates default_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.default_templates
    ADD CONSTRAINT default_templates_pkey PRIMARY KEY (id);


--
-- Name: default_templates default_templates_user_level_id_template_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.default_templates
    ADD CONSTRAINT default_templates_user_level_id_template_id_key UNIQUE (user_level_id, template_id);


--
-- Name: game_provider_configs game_provider_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_provider_configs
    ADD CONSTRAINT game_provider_configs_pkey PRIMARY KEY (id);


--
-- Name: game_provider_configs game_provider_configs_provider_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_provider_configs
    ADD CONSTRAINT game_provider_configs_provider_name_key UNIQUE (provider_name);


--
-- Name: games games_game_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_game_code_key UNIQUE (game_code);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: ggr_audit_log ggr_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ggr_audit_log
    ADD CONSTRAINT ggr_audit_log_pkey PRIMARY KEY (id);


--
-- Name: ggr_filter_settings ggr_filter_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ggr_filter_settings
    ADD CONSTRAINT ggr_filter_settings_pkey PRIMARY KEY (id);


--
-- Name: kyc_documents kyc_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kyc_documents
    ADD CONSTRAINT kyc_documents_pkey PRIMARY KEY (id);


--
-- Name: modules moduals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT moduals_pkey PRIMARY KEY (id);


--
-- Name: payment_gateways payment_gateways_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_gateways
    ADD CONSTRAINT payment_gateways_code_key UNIQUE (code);


--
-- Name: payment_gateways payment_gateways_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_gateways
    ADD CONSTRAINT payment_gateways_pkey PRIMARY KEY (id);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: rtp_settings rtp_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rtp_settings
    ADD CONSTRAINT rtp_settings_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: statuses statuses_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_name_key UNIQUE (name);


--
-- Name: statuses statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.statuses
    ADD CONSTRAINT statuses_pkey PRIMARY KEY (id);


--
-- Name: template_configs template_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_configs
    ADD CONSTRAINT template_configs_pkey PRIMARY KEY (id);


--
-- Name: template_configs template_configs_template_id_config_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_configs
    ADD CONSTRAINT template_configs_template_id_config_key_key UNIQUE (template_id, config_key);


--
-- Name: template_features template_features_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_features
    ADD CONSTRAINT template_features_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: tokens tokens_access_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_access_token_unique UNIQUE (access_token);


--
-- Name: tokens tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_activity_logs user_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: user_balances user_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_balances
    ADD CONSTRAINT user_balances_pkey PRIMARY KEY (user_id);


--
-- Name: user_category_balances user_category_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_balances
    ADD CONSTRAINT user_category_balances_pkey PRIMARY KEY (user_id, category);


--
-- Name: user_game_bets user_game_bets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_game_bets
    ADD CONSTRAINT user_game_bets_pkey PRIMARY KEY (user_id, game_id);


--
-- Name: user_game_preferences user_game_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_game_preferences
    ADD CONSTRAINT user_game_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_game_preferences user_game_preferences_user_id_game_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_game_preferences
    ADD CONSTRAINT user_game_preferences_user_id_game_id_key UNIQUE (user_id, game_id);


--
-- Name: user_level_progress user_level_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_level_progress
    ADD CONSTRAINT user_level_progress_pkey PRIMARY KEY (id);


--
-- Name: user_levels user_levels_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_levels
    ADD CONSTRAINT user_levels_name_key UNIQUE (name);


--
-- Name: user_levels user_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_levels
    ADD CONSTRAINT user_levels_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: user_promotions user_promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_promotions
    ADD CONSTRAINT user_promotions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_id_key UNIQUE (session_id);


--
-- Name: user_template_features user_template_features_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_template_features
    ADD CONSTRAINT user_template_features_pkey PRIMARY KEY (id);


--
-- Name: user_template_features user_template_features_user_id_template_id_feature_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_template_features
    ADD CONSTRAINT user_template_features_user_id_template_id_feature_id_key UNIQUE (user_id, template_id, feature_id);


--
-- Name: user_templates user_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_templates
    ADD CONSTRAINT user_templates_pkey PRIMARY KEY (id);


--
-- Name: user_templates user_templates_user_id_template_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_templates
    ADD CONSTRAINT user_templates_user_id_template_id_key UNIQUE (user_id, template_id);


--
-- Name: users users_pkey1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey1 PRIMARY KEY (id);


--
-- Name: idx_bets_game_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bets_game_id ON public.bets USING btree (game_id);


--
-- Name: idx_bets_outcome; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bets_outcome ON public.bets USING btree (outcome);


--
-- Name: idx_bets_placed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bets_placed_at ON public.bets USING btree (placed_at);


--
-- Name: idx_bets_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bets_user_id ON public.bets USING btree (user_id);


--
-- Name: idx_bets_user_outcome; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bets_user_outcome ON public.bets USING btree (user_id, outcome);


--
-- Name: idx_captcha_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_captcha_expires_at ON public.captcha USING btree (expires_at);


--
-- Name: idx_games_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_games_active ON public.games USING btree (is_active);


--
-- Name: idx_games_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_games_category ON public.games USING btree (category);


--
-- Name: idx_games_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_games_provider ON public.games USING btree (provider);


--
-- Name: idx_games_vendor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_games_vendor ON public.games USING btree (vendor);


--
-- Name: idx_kyc_documents_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kyc_documents_status ON public.kyc_documents USING btree (status);


--
-- Name: idx_kyc_documents_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kyc_documents_type ON public.kyc_documents USING btree (document_type);


--
-- Name: idx_kyc_documents_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kyc_documents_user_id ON public.kyc_documents USING btree (user_id);


--
-- Name: idx_payment_gateways_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_gateways_active ON public.payment_gateways USING btree (is_active);


--
-- Name: idx_payment_gateways_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_gateways_code ON public.payment_gateways USING btree (code);


--
-- Name: idx_payment_gateways_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_gateways_type ON public.payment_gateways USING btree (type);


--
-- Name: idx_tokens_access_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tokens_access_token ON public.tokens USING btree (access_token);


--
-- Name: idx_tokens_expired_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tokens_expired_at ON public.tokens USING btree (expired_at);


--
-- Name: idx_tokens_refresh_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_tokens_refresh_token ON public.tokens USING btree (refresh_token);


--
-- Name: idx_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tokens_user_id ON public.tokens USING btree (user_id);


--
-- Name: idx_transactions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at);


--
-- Name: idx_transactions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);


--
-- Name: idx_transactions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);


--
-- Name: idx_transactions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);


--
-- Name: idx_transactions_user_type_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_user_type_status ON public.transactions USING btree (user_id, type, status);


--
-- Name: idx_user_activity_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_logs_action ON public.user_activity_logs USING btree (action);


--
-- Name: idx_user_activity_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs USING btree (created_at);


--
-- Name: idx_user_activity_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs USING btree (user_id);


--
-- Name: idx_user_balances_balance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_balances_balance ON public.user_balances USING btree (balance);


--
-- Name: idx_user_balances_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_balances_user_id ON public.user_balances USING btree (user_id);


--
-- Name: idx_user_game_preferences_favorite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_game_preferences_favorite ON public.user_game_preferences USING btree (is_favorite);


--
-- Name: idx_user_game_preferences_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_game_preferences_user_id ON public.user_game_preferences USING btree (user_id);


--
-- Name: idx_user_level_progress_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_level_progress_user_id ON public.user_level_progress USING btree (user_id);


--
-- Name: idx_user_profiles_country; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_country ON public.user_profiles USING btree (country);


--
-- Name: idx_user_profiles_nationality; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_nationality ON public.user_profiles USING btree (nationality);


--
-- Name: idx_user_profiles_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_phone ON public.user_profiles USING btree (phone_number);


--
-- Name: idx_user_profiles_verification_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_verification_level ON public.user_profiles USING btree (verification_level);


--
-- Name: idx_user_promotions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_promotions_status ON public.user_promotions USING btree (status);


--
-- Name: idx_user_promotions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_promotions_user_id ON public.user_promotions USING btree (user_id);


--
-- Name: idx_user_sessions_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_active ON public.user_sessions USING btree (is_active);


--
-- Name: idx_user_sessions_ip; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_ip ON public.user_sessions USING btree (ip_address);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: bets sync_balance_on_bet; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sync_balance_on_bet AFTER INSERT OR DELETE OR UPDATE ON public.bets FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_balance();


--
-- Name: transactions sync_balance_on_transaction; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sync_balance_on_transaction AFTER INSERT OR DELETE OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_balance();


--
-- Name: game_provider_configs trg_set_updated_at_game_provider_configs; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_game_provider_configs BEFORE UPDATE ON public.game_provider_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_game_provider_configs();


--
-- Name: games trg_set_updated_at_games; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_games BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: kyc_documents trg_set_updated_at_kyc_documents; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_kyc_documents BEFORE UPDATE ON public.kyc_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: payment_gateways trg_set_updated_at_payment_gateways; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_payment_gateways BEFORE UPDATE ON public.payment_gateways FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: promotions trg_set_updated_at_promotions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_promotions BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: roles trg_set_updated_at_roles; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_roles BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: statuses trg_set_updated_at_statuses; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_statuses BEFORE UPDATE ON public.statuses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tokens trg_set_updated_at_tokens; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_tokens BEFORE UPDATE ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_activity_logs trg_set_updated_at_user_activity_logs; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_user_activity_logs BEFORE UPDATE ON public.user_activity_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_balances trg_set_updated_at_user_balances; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_user_balances BEFORE UPDATE ON public.user_balances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_game_preferences trg_set_updated_at_user_game_preferences; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_user_game_preferences BEFORE UPDATE ON public.user_game_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_levels trg_set_updated_at_user_levels; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_user_levels BEFORE UPDATE ON public.user_levels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_profiles trg_set_updated_at_user_profiles; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_user_profiles BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_promotions trg_set_updated_at_user_promotions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_user_promotions BEFORE UPDATE ON public.user_promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_roles trg_set_updated_at_user_roles; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_user_roles BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_sessions trg_set_updated_at_user_sessions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at_user_sessions BEFORE UPDATE ON public.user_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bets bets_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id);


--
-- Name: bets bets_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id);


--
-- Name: default_templates default_templates_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.default_templates
    ADD CONSTRAINT default_templates_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: default_templates default_templates_user_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.default_templates
    ADD CONSTRAINT default_templates_user_level_id_fkey FOREIGN KEY (user_level_id) REFERENCES public.user_levels(id) ON DELETE CASCADE;


--
-- Name: kyc_documents kyc_documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kyc_documents
    ADD CONSTRAINT kyc_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: template_configs template_configs_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_configs
    ADD CONSTRAINT template_configs_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: template_features template_features_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_features
    ADD CONSTRAINT template_features_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: user_balances user_balances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_balances
    ADD CONSTRAINT user_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_game_preferences user_game_preferences_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_game_preferences
    ADD CONSTRAINT user_game_preferences_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id);


--
-- Name: user_game_preferences user_game_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_game_preferences
    ADD CONSTRAINT user_game_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_level_progress user_level_progress_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_level_progress
    ADD CONSTRAINT user_level_progress_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.user_levels(id);


--
-- Name: user_level_progress user_level_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_level_progress
    ADD CONSTRAINT user_level_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_promotions user_promotions_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_promotions
    ADD CONSTRAINT user_promotions_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id);


--
-- Name: user_promotions user_promotions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_promotions
    ADD CONSTRAINT user_promotions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_template_features user_template_features_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_template_features
    ADD CONSTRAINT user_template_features_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.template_features(id) ON DELETE CASCADE;


--
-- Name: user_template_features user_template_features_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_template_features
    ADD CONSTRAINT user_template_features_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: user_template_features user_template_features_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_template_features
    ADD CONSTRAINT user_template_features_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_templates user_templates_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_templates
    ADD CONSTRAINT user_templates_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: user_templates user_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_templates
    ADD CONSTRAINT user_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.statuses(id);


--
-- PostgreSQL database dump complete
--

