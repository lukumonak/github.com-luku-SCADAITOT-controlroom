--
-- PostgreSQL database dump
--

\restrict Z2vZTceFHacAbjdaLXO2pk5D0f94dMtD5Wn9qBukwksZl50c89eHgq8BCUGqXnS

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: duty_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.duty_assignments (
    id integer NOT NULL,
    employee_id integer,
    department character varying(10) NOT NULL,
    duty_date date NOT NULL,
    start_time time without time zone DEFAULT '09:00:00'::time without time zone,
    end_time time without time zone DEFAULT '08:59:00'::time without time zone,
    created_at timestamp without time zone DEFAULT now(),
    end_date date NOT NULL
);


ALTER TABLE public.duty_assignments OWNER TO postgres;

--
-- Name: duty_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.duty_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.duty_assignments_id_seq OWNER TO postgres;

--
-- Name: duty_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.duty_assignments_id_seq OWNED BY public.duty_assignments.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    sl_no integer,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    department character varying(10) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT employees_department_check CHECK (((department)::text = ANY ((ARRAY['IT'::character varying, 'OT'::character varying])::text[])))
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employees_id_seq OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: remarks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.remarks (
    id integer NOT NULL,
    ticket_id integer,
    remark text NOT NULL,
    added_by character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.remarks OWNER TO postgres;

--
-- Name: remarks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.remarks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.remarks_id_seq OWNER TO postgres;

--
-- Name: remarks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.remarks_id_seq OWNED BY public.remarks.id;


--
-- Name: resolver_rotation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resolver_rotation (
    id integer NOT NULL,
    current_index integer DEFAULT 0
);


ALTER TABLE public.resolver_rotation OWNER TO postgres;

--
-- Name: resolver_rotation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resolver_rotation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resolver_rotation_id_seq OWNER TO postgres;

--
-- Name: resolver_rotation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resolver_rotation_id_seq OWNED BY public.resolver_rotation.id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    ticket_no character varying(20) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    severity character varying(20) DEFAULT 'medium'::character varying,
    status character varying(20) DEFAULT 'open'::character varying,
    created_by character varying(100),
    assigned_to character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    image_url text,
    department character varying(50) DEFAULT 'NERLDC IT'::character varying,
    resolved_at timestamp without time zone,
    resolver_image_url text
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tickets_id_seq OWNER TO postgres;

--
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    role character varying(50) DEFAULT 'operator'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
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
-- Name: duty_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.duty_assignments ALTER COLUMN id SET DEFAULT nextval('public.duty_assignments_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: remarks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.remarks ALTER COLUMN id SET DEFAULT nextval('public.remarks_id_seq'::regclass);


--
-- Name: resolver_rotation id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resolver_rotation ALTER COLUMN id SET DEFAULT nextval('public.resolver_rotation_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: duty_assignments duty_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.duty_assignments
    ADD CONSTRAINT duty_assignments_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: remarks remarks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.remarks
    ADD CONSTRAINT remarks_pkey PRIMARY KEY (id);


--
-- Name: resolver_rotation resolver_rotation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resolver_rotation
    ADD CONSTRAINT resolver_rotation_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_ticket_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_no_key UNIQUE (ticket_no);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: duty_assignments duty_assignments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.duty_assignments
    ADD CONSTRAINT duty_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: remarks remarks_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.remarks
    ADD CONSTRAINT remarks_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Z2vZTceFHacAbjdaLXO2pk5D0f94dMtD5Wn9qBukwksZl50c89eHgq8BCUGqXnS

