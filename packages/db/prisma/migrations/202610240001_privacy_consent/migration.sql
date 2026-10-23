BEGIN;

CREATE TYPE "ConsentStatus" AS ENUM ('ACCEPTED', 'DECLINED', 'WITHDRAWN');

CREATE TABLE "privacy_policies" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "version" TEXT NOT NULL UNIQUE,
  "title_en" TEXT NOT NULL,
  "body_en" TEXT NOT NULL,
  "title_fil" TEXT NOT NULL,
  "body_fil" TEXT NOT NULL,
  "effective_at" TIMESTAMP(3) NOT NULL,
  "is_current" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "privacy_policies_one_current" ON "privacy_policies" ("is_current") WHERE "is_current"=TRUE;

CREATE TABLE "user_consents" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "policy_id" TEXT NOT NULL,
  "status" "ConsentStatus" NOT NULL,
  "language" VARCHAR(3) NOT NULL CHECK ("language" IN ('en','fil')),
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_consents_user_id_tenant_id_fkey" FOREIGN KEY ("user_id","tenant_id") REFERENCES "users"("id","tenant_id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "user_consents_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "privacy_policies"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX "user_consent_user_policy_created" ON "user_consents" ("user_id","policy_id","created_at");
CREATE INDEX "user_consent_tenant_user_policy_created" ON "user_consents" ("tenant_id","user_id","policy_id","created_at");

CREATE FUNCTION reject_consent_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Consent history is append-only' USING ERRCODE='23514';
END;
$$;
CREATE TRIGGER "user_consents_append_only" BEFORE UPDATE OR DELETE OR TRUNCATE ON "user_consents"
FOR EACH STATEMENT EXECUTE FUNCTION reject_consent_mutation();

CREATE FUNCTION protect_privacy_policy() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'Published privacy policies cannot be deleted' USING ERRCODE='23514';
  END IF;
  IF ROW(OLD.id,OLD.version,OLD.title_en,OLD.body_en,OLD.title_fil,OLD.body_fil,OLD.effective_at,OLD.created_at)
     IS DISTINCT FROM ROW(NEW.id,NEW.version,NEW.title_en,NEW.body_en,NEW.title_fil,NEW.body_fil,NEW.effective_at,NEW.created_at) THEN
    RAISE EXCEPTION 'Publish a new version instead of editing a privacy policy' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "privacy_policies_immutable" BEFORE UPDATE OR DELETE ON "privacy_policies"
FOR EACH ROW EXECUTE FUNCTION protect_privacy_policy();
CREATE TRIGGER "privacy_policies_no_truncate" BEFORE TRUNCATE ON "privacy_policies"
FOR EACH STATEMENT EXECUTE FUNCTION reject_consent_mutation();

INSERT INTO privacy_policies (id,version,title_en,body_en,title_fil,body_fil,effective_at,is_current)
VALUES ('privacy-2026-10-24','2026-10-24','PractiSync Privacy Notice','## 1. Who we are
Rizal Technological University (RTU) uses PractiSync to manage on-the-job training (OJT). This notice explains how personal data is used in the system. PractiSync users are 18 or older.

## 2. What we collect
We collect your name, email address, student number and course where applicable, login logs, and documents you upload. Uploaded documents may contain personal data about you or other people. Only upload information needed for your OJT work and that you are authorized to share.
We also record your privacy choices, notice version, language, date and time, IP address when available, and browser or device user-agent information so we can keep a record of your choice.

## 3. Why we use your data
We use this information to manage OJT placements, monitor training progress, coordinate students, professors and host-company supervisors, secure the system, maintain audit records, and operate PractiSync. These data are needed to provide the system''s services; we do not ask for optional marketing consent.

## 4. Who can access it
Authorized RTU staff and coordinators can access information needed for their assigned work. OJT supervisors from host companies are external to RTU: they are not school members. They can view the student information needed to supervise students assigned to them, within their authorized access. We do not sell personal data.

## 5. Service providers
Hosting and data location: [HOSTING PROVIDER AND DATA LOCATION: currently local development, to be filled in before deployment].
Email and storage services: [LIST].
These details must be completed before deployment. Service providers that process personal data for RTU must do so only for the agreed services and with appropriate safeguards. Uploaded documents are scanned using ClamAV and converted using Gotenberg as part of document processing.

## 6. How long we keep data
Proposed student-record retention: [5 YEARS, placeholder]. Proposed login-log retention: [1 YEAR, placeholder]. RTU must confirm these periods and when each period starts before deployment.
After the applicable period, records are securely deleted or anonymized so they can no longer identify you, unless a law or a documented, lawful need requires longer retention. Withdrawing consent does not automatically erase records that must lawfully be kept. Contact the Data Protection Officer (DPO) about your records or a request to erase or block data.

## 7. How we protect it
PractiSync uses role-based access controls, tenant isolation between institutions, antivirus scanning of uploads, and access logging. These measures limit who can see and use personal data and help investigate security issues. No system can promise absolute security.

## 8. Your rights
Under the Data Privacy Act of 2012 (Republic Act No. 10173), and subject to the applicable conditions and limits, you have rights to:
- Be informed about how your personal data is processed.
- Access your personal data.
- Object to processing and withdraw consent.
- Have inaccurate or incomplete data corrected.
- Request erasure or blocking of personal data.
- Obtain or transfer eligible data in a usable electronic format (data portability).
- Seek damages for a violation of your data privacy rights.
- File a complaint with the National Privacy Commission at [privacy.gov.ph](https://privacy.gov.ph/).

Contact the DPO below to ask questions or exercise your rights. RTU will assess requests under the applicable law; a request does not guarantee that every record can be deleted.

## 9. Your choice and access to PractiSync
Read this notice before choosing. You can decline, or withdraw later in Settings → Privacy. Under PractiSync''s access rules, we cannot provide access to the system without your agreement. This is a system access rule, not a claim that the law requires you to consent.
Declining or withdrawing blocks access to the workspace. You can return to the consent page and agree at any time. Contact the OJT office or DPO if you need help with OJT arrangements outside the system. Your earlier privacy choices remain in the consent history.

## 10. Contact the Data Protection Officer
Name: [DPO NAME]
Email: [DPO EMAIL]
Phone or office: [DPO PHONE/OFFICE]

## 11. Version and changes
Policy version: 2026-10-24. Effective date: October 24, 2026 (Philippine time).
When a new policy version is published, PractiSync shows the updated notice on your next request and asks you to choose again before using the workspace. Refreshing a page or the passage of time alone does not require a new choice. The notice is also available on the public privacy policy page.','Abiso sa Pagkapribado ng PractiSync','## 1. Sino kami
Ginagamit ng Rizal Technological University (RTU) ang PractiSync upang pamahalaan ang on-the-job training (OJT). Ipinapaliwanag ng abisong ito kung paano ginagamit ang personal na datos sa sistema. Ang mga gumagamit ng PractiSync ay 18 taong gulang pataas.

## 2. Ano ang kinokolekta namin
Kinokolekta namin ang iyong pangalan, email address, student number at kurso kung naaangkop, mga tala ng pag-sign in, at mga dokumentong ina-upload mo. Maaaring may personal na datos mo o ng ibang tao ang mga dokumento. I-upload lamang ang impormasyong kailangan sa iyong OJT at pinapayagan kang ibahagi.
Itinatala rin namin ang iyong mga pasya tungkol sa pagkapribado, bersiyon ng abiso, wika, petsa at oras, IP address kung available, at user-agent na impormasyon ng browser o device upang may tala ng iyong pasya.

## 3. Bakit namin ginagamit ang iyong datos
Ginagamit namin ang impormasyon upang pamahalaan ang mga OJT placement, subaybayan ang pag-unlad ng pagsasanay, mapadali ang ugnayan ng mga estudyante, propesor at supervisor ng host company, panatilihing ligtas ang sistema, magtala para sa audit, at patakbuhin ang PractiSync. Kailangan ang mga datos na ito upang maibigay ang serbisyo ng sistema; hindi kami humihingi ng opsiyonal na pahintulot para sa marketing.

## 4. Sino ang maaaring makakita nito
Maaaring makita ng awtorisadong kawani at coordinator ng RTU ang impormasyong kailangan sa kanilang tungkulin. Ang mga OJT supervisor mula sa mga host company ay mula sa labas ng RTU: hindi sila mga miyembro ng paaralan. Makikita lamang nila ang impormasyon ng mga estudyanteng nakatalaga sa kanila na kailangan sa pangangasiwa, ayon sa kanilang awtorisadong access. Hindi namin ibinebenta ang personal na datos.

## 5. Mga service provider
Hosting at lokasyon ng datos: [HOSTING PROVIDER AND DATA LOCATION: currently local development, to be filled in before deployment].
Mga serbisyo para sa email at storage: [LIST].
Dapat kumpletuhin ang mga detalyeng ito bago ang deployment. Ang mga service provider na nagpoproseso ng personal na datos para sa RTU ay dapat gumamit nito para lamang sa napagkasunduang serbisyo at may angkop na proteksiyon. Sinusuri ng ClamAV ang mga upload para sa virus at kino-convert ng Gotenberg ang mga dokumento bilang bahagi ng pagproseso.

## 6. Gaano katagal namin itinatago ang datos
Iminungkahing panahon para sa mga rekord ng estudyante: [5 YEARS, placeholder]. Iminungkahing panahon para sa mga tala ng pag-sign in: [1 YEAR, placeholder]. Kailangang kumpirmahin ng RTU ang mga panahong ito at kung kailan nagsisimula ang bawat isa bago ang deployment.
Pagkatapos ng naaangkop na panahon, ligtas na binubura ang mga rekord o inaalis ang impormasyong maaaring makakilala sa iyo, maliban kung may batas o dokumentadong lehitimong dahilan upang itago pa ang mga ito. Ang pagbawi ng pahintulot ay hindi awtomatikong nagbubura ng mga rekord na kailangang panatilihin ayon sa batas. Makipag-ugnayan sa Data Protection Officer (DPO) tungkol sa iyong mga rekord o kahilingang burahin o harangin ang datos.

## 7. Paano namin pinoprotektahan ang datos
Gumagamit ang PractiSync ng access ayon sa tungkulin, paghihiwalay ng datos ng bawat institusyon (tenant isolation), antivirus scanning ng mga upload, at pagtatala ng access. Nililimitahan ng mga ito kung sino ang makakakita at gagamit ng personal na datos at tumutulong sa pagsisiyasat ng mga isyu sa seguridad. Walang sistemang makapangangako ng ganap na seguridad.

## 8. Ang iyong mga karapatan
Sa ilalim ng Data Privacy Act of 2012 (Republic Act No. 10173), at ayon sa naaangkop na mga kondisyon at limitasyon, may karapatan kang:
- Malaman kung paano pinoproseso ang iyong personal na datos.
- Makakuha ng access sa iyong personal na datos.
- Tumutol sa pagproseso at bawiin ang pahintulot.
- Ipatama ang mali o kulang na datos.
- Humiling na burahin o harangin ang personal na datos.
- Makakuha o maglipat ng naaangkop na datos sa magagamit na elektronikong format (data portability).
- Humingi ng danyos para sa paglabag sa iyong mga karapatan sa pagkapribado.
- Magsampa ng reklamo sa National Privacy Commission sa [privacy.gov.ph](https://privacy.gov.ph/).

Makipag-ugnayan sa DPO sa ibaba upang magtanong o gamitin ang iyong mga karapatan. Susuriin ng RTU ang mga kahilingan ayon sa batas; hindi nangangahulugan ang isang kahilingan na maaaring burahin ang lahat ng rekord.

## 9. Ang iyong pasya at access sa PractiSync
Basahin ang abisong ito bago magpasya. Maaari kang tumanggi o bawiin ang pahintulot sa Settings → Privacy. Ayon sa mga patakaran ng access sa PractiSync, hindi namin maibibigay ang access sa sistema kung hindi ka sumasang-ayon. Patakaran ito ng sistema; hindi namin sinasabing inaatasan ka ng batas na magbigay ng pahintulot.
Kapag tumanggi ka o binawi ang pahintulot, mahaharang ang access sa workspace. Maaari kang bumalik sa pahina ng pahintulot at sumang-ayon anumang oras. Makipag-ugnayan sa OJT office o DPO kung kailangan mo ng tulong para sa OJT sa labas ng sistema. Mananatili sa kasaysayan ng pahintulot ang iyong mga naunang pasya.

## 10. Makipag-ugnayan sa Data Protection Officer
Pangalan: [DPO NAME]
Email: [DPO EMAIL]
Telepono o opisina: [DPO PHONE/OFFICE]

## 11. Bersiyon at mga pagbabago
Bersiyon ng patakaran: 2026-10-24. Petsa ng bisa: Oktubre 24, 2026 (oras sa Pilipinas).
Kapag naglathala ng bagong bersiyon, ipapakita ng PractiSync ang bagong abiso sa iyong susunod na request at hihingi muli ng iyong pasya bago gamitin ang workspace. Ang pag-refresh ng pahina o paglipas ng panahon lamang ay hindi dahilan upang humingi muli ng pasya. Makikita rin ang abiso sa pampublikong pahina ng patakaran sa pagkapribado.','2026-10-23T16:00:00.000Z',TRUE);

COMMIT;
