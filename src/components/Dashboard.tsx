'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';
import { useToday } from '@/hooks/useNow';
import {
	comparisonRange,
	type DayPoint,
	dailySeries,
	effectiveEnd,
	percentChange,
	periodStats,
	weekdayAverages,
} from '@/lib/analytics';
import { messageOf } from '@/lib/api/client';
import { usePaymentMethods, usePaymentTags, useReport } from '@/lib/api/queries';
import { useTaggedReport } from '@/lib/api/tagged';
import type { ReportSlice } from '@/lib/api/types';
import { cx } from '@/lib/cx';
import {
	capitalize,
	dayAndWeekday,
	dayHref,
	formatPeriodTitle,
	formatShortDate,
} from '@/lib/dates';
import { resolvePeriod, useLedger } from '@/stores/ledger';
import { Button } from './Button';
import { ComparisonTable } from './ComparisonTable';
import { CumulativeChart } from './charts/CumulativeChart';
import { FlowChart } from './charts/FlowChart';
import { Legend } from './charts/Plot';
import { WeekdayChart } from './charts/WeekdayChart';
import styles from './Dashboard.module.css';
import { Delta } from './Delta';
import { Money, type MoneyTone } from './Money';
import { PeriodBar } from './PeriodBar';
import { Sheet } from './Sheet';

const BLANK_LINES = ['a', 'b', 'c', 'd', 'e', 'f'];

/**
 * O painel. Os números do período, a comparação com outro período,
 * e os gráficos que respondem em que dia foi diferente e para onde foi o dinheiro.
 *
 * Com tags marcadas, o painel inteiro passa a contar só as entradas dos métodos
 * de pagamento que têm essas tags. Saídas não têm tag e saem de cena.
 */
export function Dashboard() {
	const router = useRouter();
	const today = useToday();
	const period = useLedger((state) => state.period);
	const comparison = useLedger((state) => state.comparison);
	const selectedTagIds = useLedger((state) => state.tagIds);
	const { from, to } = resolvePeriod(period, today);
	// Com o que comparar é escolha de quem olha. O padrão é o período de mesmo tamanho logo antes.
	const compared = comparisonRange(comparison, period, from, effectiveEnd(from, to, today));
	// Comparação limpa. O painel mostra só o período, sem variação e sem tabela.
	const comparing = compared !== null;

	const query = useReport(from, to);
	// Sem comparação, esta consulta repete a de cima e é ignorada. Nenhum pedido a mais vai para a API.
	const previousQuery = useReport(compared?.from ?? from, compared?.to ?? to);
	const tags = usePaymentTags();
	const methods = usePaymentMethods();

	// Tag que deixou de existir não filtra nada.
	const tagIds = useMemo(
		() =>
			selectedTagIds.filter(
				(id) => tags.data === undefined || tags.data.some((tag) => tag.id === id),
			),
		[selectedTagIds, tags.data],
	);
	const filtering = tagIds.length > 0;
	// Os métodos que têm pelo menos uma das tags marcadas.
	const taggedMethods = useMemo(
		() =>
			filtering
				? (methods.data ?? []).filter((method) => method.tagIds.some((id) => tagIds.includes(id)))
				: [],
		[filtering, methods.data, tagIds],
	);
	const methodIds = useMemo(
		() => (filtering ? new Set(taggedMethods.map((method) => method.id)) : null),
		[filtering, taggedMethods],
	);

	const main = useTaggedReport(query.data, methodIds);
	const other = useTaggedReport(comparing ? previousQuery.data : undefined, methodIds);
	const report = main.report;
	const previousReport = other.report;
	// Com filtro de tag, o detalhe por dia chega depois dos totais, ou não chega em período longo.
	const dailyReady = main.daily === 'off' || main.daily === 'ready';
	const previousDailyReady = other.daily === 'off' || other.daily === 'ready';
	// Enquanto o período novo carrega, o quadro anterior fica na tela, esmaecido.
	const stale = query.isPlaceholderData || (comparing && previousQuery.isPlaceholderData);

	// O dia debaixo do ponteiro. Os dois gráficos de dias destacam o mesmo.
	const [activeDay, setActiveDay] = useState<string | null>(null);

	// As séries acompanham o relatório que está na tela, não o período pedido.
	const points = useMemo(
		() =>
			report === undefined || !dailyReady
				? []
				: dailySeries(report, report.from, effectiveEnd(report.from, report.to, today)),
		[report, dailyReady, today],
	);
	const previousPoints = useMemo(
		() =>
			previousReport === undefined || !previousDailyReady
				? []
				: dailySeries(previousReport, previousReport.from, previousReport.to),
		[previousReport, previousDailyReady],
	);
	const stats = useMemo(() => periodStats(points), [points]);
	const previousStats = useMemo(() => periodStats(previousPoints), [previousPoints]);
	const weekdays = useMemo(() => weekdayAverages(points), [points]);

	// Os nomes dos dois períodos, para a tabela, a legenda e a dica do gráfico.
	const currentLabel = capitalize(formatPeriodTitle(from, to));
	const comparedTitle = compared === null ? '' : formatPeriodTitle(compared.from, compared.to);
	const previousLabel = capitalize(comparedTitle);

	const openDay = (competence: string) => router.push(dayHref(competence, today));
	// Há com o que comparar quando o período de comparação tem algum lançamento, com ou sem filtro.
	const hasPrevious = comparing && (previousQuery.data?.days.length ?? 0) > 0;
	const change = (current: number, previous: number | undefined) =>
		hasPrevious && previous !== undefined ? percentChange(current, previous) : null;

	// A barra de cada dia é proporcional ao maior saldo do período, em módulo.
	const largestNet = Math.max(1, ...(report?.days ?? []).map((day) => Math.abs(day.netInCents)));
	const spansMonths = report !== undefined && report.from.slice(0, 7) !== report.to.slice(0, 7);
	const baseEntries = query.data?.totalEntriesInCents ?? 0;
	const hasDays = dailyReady && (report?.days.length ?? 0) > 0;

	return (
		<Sheet>
			<header className={styles.header}>
				<p className="label">Painel</p>
				<h1 className={styles.title}>{capitalize(formatPeriodTitle(from, to))}</h1>
				<p className={styles.iso}>
					{from} a {to}
				</p>

				<PeriodBar
					today={today}
					from={from}
					to={to}
					compared={compared}
					tags={tags.data ?? []}
					activeTagIds={tagIds}
					taggedMethods={taggedMethods.map((method) => method.name)}
				/>
			</header>

			{query.isPending && (
				<div className={styles.blank}>
					<p className="sr-only">Carregando o painel.</p>
					<ul aria-hidden="true">
						{BLANK_LINES.map((line) => (
							<li key={line} className={styles.blankLine} />
						))}
					</ul>
				</div>
			)}

			{query.isError && (
				<div className={styles.failure} role="alert">
					<p className="error">Não foi possível abrir o painel. {messageOf(query.error)}</p>
					<Button variant="outline" size="small" onClick={() => void query.refetch()}>
						Tentar novamente
					</Button>
				</div>
			)}

			{report !== undefined && (
				<div className={styles.frame}>
					<div className={styles.board} data-stale={stale} aria-busy={stale}>
						{/* O número que o dono veio buscar, e logo abaixo os que explicam ele. */}
						<section className={cx(styles.block, styles.full)} aria-label="Resumo do período">
							<div className={styles.hero}>
								<div>
									<p className="label">{filtering ? 'Entrou com as tags marcadas' : 'Sobrou'}</p>
									{comparing && (
										<p className={styles.versus}>
											<Delta
												change={
													filtering
														? change(report.totalEntriesInCents, previousReport?.totalEntriesInCents)
														: change(report.netInCents, previousReport?.netInCents)
												}
											/>
											{hasPrevious && (
												<span className={styles.against}>Comparado com {comparedTitle}</span>
											)}
										</p>
									)}
								</div>
								{filtering ? (
									<Money cents={report.totalEntriesInCents} tone="entry" serif />
								) : (
									<Money cents={report.netInCents} tone="net" serif />
								)}
							</div>

							{filtering ? (
								<dl className={styles.tiles}>
									<Tile label="Parte das entradas">
										<span className={styles.figure}>
											{baseEntries === 0
												? 'Sem entrada'
												: `${String(Math.round((report.totalEntriesInCents / baseEntries) * 100))}%`}
										</span>
										<span className={styles.aside}>De tudo o que entrou no período</span>
									</Tile>
									<Tile label="Métodos incluídos">
										<span className={styles.figure}>{taggedMethods.length}</span>
										<span className={styles.aside}>
											{taggedMethods.length === 0
												? 'Nenhum método tem essas tags'
												: taggedMethods.map((method) => method.name).join(', ')}
										</span>
									</Tile>
									<Tile label="Entrou por dia">
										{dailyReady ? (
											<>
												<Money className={styles.figure} cents={stats.averageEntries} />
												{comparing && previousDailyReady && (
													<Delta change={change(stats.averageEntries, previousStats.averageEntries)} />
												)}
											</>
										) : (
											<Waiting state={main.daily} />
										)}
									</Tile>
									<Tile label="Dias com entrada">
										{dailyReady ? (
											<span className={styles.figure}>{stats.openDays}</span>
										) : (
											<Waiting state={main.daily} />
										)}
									</Tile>
									<Tile label="Melhor dia">
										{dailyReady ? (
											<DayFigure point={stats.best} tone="entry" today={today} empty="Sem entrada" />
										) : (
											<Waiting state={main.daily} />
										)}
									</Tile>
									<Tile label="Pior dia">
										{dailyReady ? (
											<DayFigure point={stats.worst} tone="entry" today={today} empty="Sem comparação" />
										) : (
											<Waiting state={main.daily} />
										)}
									</Tile>
								</dl>
							) : (
								<dl className={styles.tiles}>
									<Tile label="Entrou">
										<Money className={styles.figure} cents={report.totalEntriesInCents} tone="entry" />
										{comparing && (
											<Delta
												change={change(report.totalEntriesInCents, previousReport?.totalEntriesInCents)}
											/>
										)}
									</Tile>
									<Tile label="Saiu">
										<Money className={styles.figure} cents={report.totalExpensesInCents} tone="expense" />
										{/* Gastar mais é piora, então aqui subir é ruim. */}
										{comparing && (
											<Delta
												change={change(report.totalExpensesInCents, previousReport?.totalExpensesInCents)}
												goodWhenUp={false}
											/>
										)}
									</Tile>
									<Tile label="Entrou por dia">
										<Money className={styles.figure} cents={stats.averageEntries} />
										{comparing && (
											<Delta change={change(stats.averageEntries, previousStats.averageEntries)} />
										)}
									</Tile>
									<Tile label="Margem">
										<span className={styles.figure}>
											{stats.margin === null ? 'Sem entrada' : `${String(Math.round(stats.margin * 100))}%`}
										</span>
										<span className={styles.aside}>Do que entrou, sobrou</span>
									</Tile>
									<Tile label="Melhor dia">
										<DayFigure point={stats.best} tone="net" today={today} empty="Sem lançamento" />
									</Tile>
									<Tile label="Pior dia">
										<DayFigure point={stats.worst} tone="net" today={today} empty="Sem comparação" />
									</Tile>
								</dl>
							)}
						</section>

						{/* Os dois períodos lado a lado, medida por medida. */}
						{previousReport !== undefined && (
							<section className={cx(styles.block, styles.full)}>
								<div className={styles.head}>
									<h2 className={styles.heading}>Comparação</h2>
								</div>
								<ComparisonTable
									entriesOnly={filtering}
									withDaily={dailyReady && previousDailyReady}
									current={{
										label: currentLabel,
										entries: report.totalEntriesInCents,
										expenses: report.totalExpensesInCents,
										net: report.netInCents,
										averageEntries: stats.averageEntries,
										openDays: stats.openDays,
										margin: stats.margin,
										hasData: report.totalEntriesInCents > 0 || report.days.length > 0,
									}}
									previous={{
										label: previousLabel,
										entries: previousReport.totalEntriesInCents,
										expenses: previousReport.totalExpensesInCents,
										net: previousReport.netInCents,
										averageEntries: previousStats.averageEntries,
										openDays: previousStats.openDays,
										margin: previousStats.margin,
										hasData: hasPrevious,
									}}
								/>
							</section>
						)}

						{/* Com filtro de tag, o detalhe por dia vem das páginas dos dias, uma a uma. */}
						{main.daily === 'loading' && (
							<p className={cx(styles.nothing, styles.full)} role="status">
								Carregando os dias do período, {main.loaded} de {main.total}
							</p>
						)}
						{main.daily === 'unavailable' && (
							<p className={cx(styles.notice, styles.full)}>
								Com filtro de tag, os gráficos por dia aparecem em períodos de até três meses. Os
								totais acima já estão filtrados.
							</p>
						)}

						{dailyReady && !hasDays && (
							<p className={cx(styles.nothing, styles.full)}>
								{filtering
									? 'Nenhuma entrada com essas tags neste período'
									: 'Nenhum lançamento neste período'}
							</p>
						)}

						{hasDays && (
							<>
								<section className={cx(styles.block, styles.full)}>
									<div className={styles.head}>
										<h2 className={styles.heading}>
											{filtering ? 'Entrou por dia' : 'Entrou e saiu por dia'}
										</h2>
										{/* Uma série só não precisa de legenda. O título já diz o que está no gráfico. */}
										{!filtering && (
											<Legend
												items={[
													{ series: 'entry', label: 'Entrou, para cima' },
													{ series: 'expense', label: 'Saiu, para baixo' },
												]}
											/>
										)}
									</div>
									<FlowChart points={points} active={activeDay} onActive={setActiveDay} onOpen={openDay} />
								</section>

								<section className={styles.block}>
									<div className={styles.head}>
										<h2 className={styles.heading}>
											{filtering ? 'Entrada acumulada' : 'Saldo acumulado'}
										</h2>
										<Legend
											items={
												hasPrevious && previousDailyReady
													? [
															{ series: 'current', label: currentLabel },
															{ series: 'previous', label: previousLabel },
														]
													: [{ series: 'current', label: currentLabel }]
											}
										/>
									</div>
									<CumulativeChart
										points={points}
										previous={hasPrevious && previousDailyReady ? previousPoints : []}
										currentLabel={currentLabel}
										previousLabel={previousLabel}
										active={activeDay}
										onActive={setActiveDay}
										onOpen={openDay}
									/>
								</section>

								<section className={styles.block}>
									<div className={styles.head}>
										<h2 className={styles.heading}>Entrada média por dia da semana</h2>
									</div>
									<WeekdayChart rows={weekdays} />
								</section>
							</>
						)}

						{/* A API já devolve do maior para o menor. A ordem é dela. */}
						{report.byPaymentMethod.length > 0 && (
							<Slices
								title="De onde veio"
								items={report.byPaymentMethod}
								total={report.totalEntriesInCents}
							/>
						)}
						{report.byExpenseCategory.length > 0 && (
							<Slices
								title="Para onde foi"
								items={report.byExpenseCategory}
								total={report.totalExpensesInCents}
								expense
							/>
						)}

						{/* A coluna de dias é o extrato, e também a versão em tabela dos gráficos de dias. */}
						{hasDays && (
							<section className={cx(styles.block, styles.full)}>
								<div className={styles.head}>
									<h2 className={styles.heading}>Dias</h2>
								</div>
								<div className={styles.days} data-entries-only={filtering}>
									<div className={cx(styles.row, styles.columns)} aria-hidden="true">
										<span>Dia</span>
										<span />
										{!filtering && <span className={styles.wideOnly}>Entrou</span>}
										{!filtering && <span className={styles.wideOnly}>Saiu</span>}
										<span>{filtering ? 'Entrou' : 'Saldo'}</span>
									</div>
									<ul className={styles.dayList}>
										{report.days.map((day) => {
											const label = dayAndWeekday(day.competence);
											const share = Math.abs(day.netInCents) / largestNet;

											return (
												<li key={day.id} className={styles.row}>
													<Link
														className={styles.dayLink}
														href={dayHref(day.competence, today)}
														data-active={day.competence === activeDay}
													>
														<span className={styles.day}>
															{label.day}
															{spansMonths && `/${day.competence.slice(5, 7)}`}
															<span className={styles.weekday}> {label.weekday}</span>
														</span>
														<span aria-hidden="true">
															<Bar
																share={share}
																red={day.netInCents < 0}
																fromRight={day.netInCents < 0}
															/>
														</span>
														{!filtering && (
															<span className={styles.wideOnly}>
																<span className="sr-only">Entrou </span>
																<Money cents={day.totalEntriesInCents} tone="entry" />
															</span>
														)}
														{!filtering && (
															<span className={styles.wideOnly}>
																<span className="sr-only">Saiu </span>
																<Money cents={day.totalExpensesInCents} tone="expense" />
															</span>
														)}
														{filtering ? (
															<span>
																<span className="sr-only">Entrou </span>
																<Money cents={day.totalEntriesInCents} tone="entry" />
															</span>
														) : (
															<span>
																<span className="sr-only">Saldo </span>
																<Money cents={day.netInCents} tone="net" column />
															</span>
														)}
													</Link>
												</li>
											);
										})}
									</ul>
								</div>
							</section>
						)}
					</div>
				</div>
			)}
		</Sheet>
	);
}

function Tile({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className={styles.tile}>
			<dt className="label">{label}</dt>
			<dd className={styles.tileBody}>{children}</dd>
		</div>
	);
}

/** O valor de um dia de destaque, com o caminho para a página dele. */
function DayFigure({
	point,
	tone,
	today,
	empty,
}: {
	point: DayPoint | null;
	tone: MoneyTone;
	today: string;
	empty: string;
}) {
	if (point === null) return <span className={styles.aside}>{empty}</span>;

	return (
		<>
			<Money className={styles.figure} cents={point.net} tone={tone} />
			<Link className={styles.dayRef} href={dayHref(point.competence, today)}>
				{capitalize(formatShortDate(point.competence))}
			</Link>
		</>
	);
}

/** O que mostrar num indicador que depende do detalhe por dia, enquanto ele não está na tela. */
function Waiting({ state }: { state: string }) {
	return (
		<span className={styles.aside}>
			{state === 'loading' ? 'Carregando' : 'Só em períodos de até três meses'}
		</span>
	);
}

interface BarProps {
	share: number;
	red?: boolean;
	/** Saldo negativo sai da direita, para a diferença não depender só da cor. */
	fromRight?: boolean;
}

/** Barra fina que vive dentro da linha. */
function Bar({ share, red = false, fromRight = false }: BarProps) {
	return (
		<span className={styles.track}>
			<span
				className={styles.bar}
				data-red={red}
				data-from-right={fromRight}
				data-empty={share === 0}
				style={{ width: `${String(Math.round(share * 1000) / 10)}%` }}
			/>
		</span>
	);
}

interface SlicesProps {
	title: string;
	items: ReportSlice[];
	total: number;
	expense?: boolean;
}

/**
 * Parte do todo, em barras ordenadas. Categorias sem ordem natural ganham todas
 * a mesma cor, e o comprimento é que diz o tamanho. A porcentagem fecha a conta.
 */
function Slices({ title, items, total, expense = false }: SlicesProps) {
	const largest = Math.max(1, ...items.map((item) => item.totalInCents));

	return (
		<section className={styles.block}>
			<div className={styles.head}>
				<h2 className={styles.heading}>{title}</h2>
			</div>
			<ul className={styles.slices}>
				{items.map((item) => (
					<li key={item.id} className={styles.slice}>
						<span className={styles.sliceName}>{item.name}</span>
						<span className={styles.sliceBar} aria-hidden="true">
							<Bar share={item.totalInCents / largest} red={expense} />
						</span>
						<span className={styles.share}>
							{total === 0 ? '0' : Math.round((item.totalInCents / total) * 100)}%
						</span>
						<Money className={styles.sliceValue} cents={item.totalInCents} />
					</li>
				))}
			</ul>
		</section>
	);
}
